import { NonNegativeIntFromString } from "$lib/schema.js";
import { getNestedCategoriesData } from "$lib/server/data/category";
import {
	getDashboardTransactionsData,
	upsertTransactionData,
} from "$lib/server/data/transaction";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { NodeSdkLive } from "$lib/server/observability";
import { calculateDashboardData } from "$lib/utils/transaction";
import { CalendarDate } from "@internationalized/date";
import { fail, redirect } from "@sveltejs/kit";
import { and, eq, lt, sum } from "drizzle-orm";
import { Effect } from "effect";
import * as z from "zod";

const program = Effect.fn("[load] - '/'")(function* ({
	userId,
	searchParamsCategory,
	searchParamsWallet,
	searchParamsPaid,
	searchParamsMonth,
	searchParamsYear,
}: {
	userId: string;
	searchParamsCategory: string | null;
	searchParamsWallet: string | null;
	searchParamsPaid: string | null;
	searchParamsMonth: string | null;
	searchParamsYear: string | null;
}) {
	const currentMonth = new Date().getMonth() + 1;
	const currentYear = new Date().getFullYear();

	const schema = z.object({
		category: z
			.string()
			.nullable()
			.transform((val) => (val ? NonNegativeIntFromString.parse(val) : -1))
			.catch(-1),
		wallet: z
			.string()
			.nullable()
			.transform((val) => (val ? NonNegativeIntFromString.parse(val) : -1))
			.catch(-1),
		paid: z
			.string()
			.nullable()
			.transform((val) => (val === null ? null : val === "true"))
			.catch(null),
		month: z
			.string()
			.nullable()
			.transform((val) => {
				if (!val) return currentMonth;
				const parsed = NonNegativeIntFromString.parse(val);
				return parsed >= 1 && parsed <= 12 ? parsed : currentMonth;
			})
			.catch(currentMonth),
		year: z
			.string()
			.nullable()
			.transform((val) => (val ? NonNegativeIntFromString.parse(val) : currentYear))
			.catch(currentYear),
	});
	const { category, wallet, paid, month, year } = schema.parse({
		category: searchParamsCategory,
		wallet: searchParamsWallet,
		paid: searchParamsPaid,
		month: searchParamsMonth,
		year: searchParamsYear,
	});

	const date = new CalendarDate(year, month, 1);
	const dateMonthLater = new CalendarDate(year, month, 1).set({ day: 100 });

	const [allTransactions, categories, wallets, balanceResult] = yield* Effect.all(
		[
			getDashboardTransactionsData({
				userId,
				start: date.toString(),
				end: dateMonthLater.toString(),
			}),
			getNestedCategoriesData(userId),
			exec(
				db.query.wallet.findMany({
					columns: { id: true, name: true, initialBalance: true },
					where(fields, { eq }) {
						return eq(fields.userId, userId);
					},
					orderBy(fields, operators) {
						return [operators.asc(fields.name)];
					},
				}),
			),
			exec(
				db
					.select({ balance: sum(table.transaction.cents) })
					.from(table.transaction)
					.groupBy(table.transaction.userId)
					.where(
						and(
							eq(table.transaction.userId, userId),
							lt(table.transaction.date, dateMonthLater.toString()),
							eq(table.transaction.paid, true),
						),
					),
			),
		],
		{ concurrency: "unbounded" },
	);

	const transactions = allTransactions.filter((t) => {
		if (wallet !== -1 && wallet !== t.wallet.id) {
			return false;
		}
		if (category !== -1 && ![t.category.id, t.categoryParent?.id].includes(category)) {
			return false;
		}
		if (paid !== null) {
			if (paid && !t.paid) return false;
			if (!paid && t.paid) return false;
		}
		return true;
	});

	const balance = z
		.string()
		.transform((val) => parseInt(val))
		.catch(0)
		.parse(balanceResult[0]?.balance || "0");

	const { totalIncome, totalExpense, filteredIncome, filteredExpense, charts } =
		calculateDashboardData(allTransactions, wallet, category);

	return {
		category,
		categories,
		wallet,
		wallets,
		balance: balance + wallets.reduce((acc, w) => acc + w.initialBalance, 0),
		transactions,
		totalIncome,
		totalExpense,
		filteredIncome,
		filteredExpense,
		month,
		year,
		charts,
	};
});

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	return await Effect.runPromise(
		program({
			userId: event.locals.user.id,
			searchParamsCategory: event.url.searchParams.get("category"),
			searchParamsWallet: event.url.searchParams.get("wallet"),
			searchParamsPaid: event.url.searchParams.get("paid"),
			searchParamsMonth: event.url.searchParams.get("month"),
			searchParamsYear: event.url.searchParams.get("year"),
		}).pipe(Effect.provide(NodeSdkLive), Effect.tapErrorCause(Effect.logError)),
	);
};

export const actions = {
	"upsert-transaction": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const searchParams = event.url.searchParams;
		const shouldContinue = searchParams.get("continue") === "true";

		const program = Effect.fn("[action] - upsert-transaction")(function* () {
			const formData = yield* Effect.tryPromise(() => event.request.formData());
			const result = yield* upsertTransactionData({
				userId: user.id,
				shouldContinue,
				formData,
			});
			return result;
		});

		return await Effect.runPromise(
			program().pipe(Effect.provide(NodeSdkLive), Effect.tapErrorCause(Effect.logError)),
		);
	},
};
