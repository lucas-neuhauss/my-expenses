import { getNestedCategories } from "$lib/server/data/category";
import {
	deleteTransaction,
	getDashboardTransactions,
	upsertTransaction,
} from "$lib/server/data/transaction";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { calculateDashboardData } from "$lib/utils/transaction";
import { CalendarDate } from "@internationalized/date";
import { fail, redirect } from "@sveltejs/kit";
import { and, eq, lt, sum } from "drizzle-orm";
import { z } from "zod/v4";

const IntSearchParamSchema = z
	.string()
	.regex(/\d+/)
	.transform(Number)
	.pipe(z.int().positive());

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}
	const userId = event.locals.user.id;

	const currentMonth = new Date().getMonth() + 1;
	const currentYear = new Date().getFullYear();

	const { category, wallet, month, year } = z
		.object({
			category: IntSearchParamSchema.catch(-1),
			wallet: IntSearchParamSchema.catch(-1),
			month: z.coerce.number().int().gte(1).lte(12).catch(currentMonth),
			year: z.coerce.number().int().gte(1900).catch(currentYear),
		})
		.parse({
			category: event.url.searchParams.get("category"),
			wallet: event.url.searchParams.get("wallet"),
			month: event.url.searchParams.get("month"),
			year: event.url.searchParams.get("year"),
		});

	const date = new CalendarDate(year, month, 1);
	const dateMonthLater = new CalendarDate(year, month, 1).set({ day: 100 });

	const transactionsPromise = getDashboardTransactions({
		userId,
		wallet,
		start: date.toString(),
		end: dateMonthLater.toString(),
	});
	const categoriesPromise = getNestedCategories(userId);
	const walletsPromise = db.query.wallet.findMany({
		columns: { id: true, name: true, initialBalance: true },
		where(fields, { eq }) {
			return eq(fields.userId, userId);
		},
		orderBy(fields, operators) {
			return [operators.asc(fields.name)];
		},
	});
	const balanceResultPromise = db
		.select({ balance: sum(table.transaction.cents) })
		.from(table.transaction)
		.groupBy(table.transaction.userId)
		.where(
			and(
				eq(table.transaction.userId, userId),
				lt(table.transaction.date, dateMonthLater.toString()),
				eq(table.transaction.paid, true),
			),
		);

	const [allTransactions, categories, wallets, balanceResult] = await Promise.all([
		transactionsPromise,
		categoriesPromise,
		walletsPromise,
		balanceResultPromise,
	]);
	const transactions = allTransactions.filter((t) => {
		if (category === -1) return true;
		return [t.category.id, t.categoryParent?.id].includes(category);
	});

	const [{ balance }] = z
		.array(z.object({ balance: z.coerce.number().int() }))
		.length(1)
		.catch([{ balance: 0 }])
		.parse(balanceResult);

	const { totalIncome, totalExpense, charts } = calculateDashboardData(allTransactions);

	return {
		category,
		categories,
		wallet,
		wallets,
		balance: balance + wallets.reduce((acc, w) => acc + w.initialBalance, 0),
		transactions,
		totalIncome,
		totalExpense,
		month,
		year,
		charts,
	};
};

export const actions = {
	"upsert-transaction": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const searchParams = event.url.searchParams;
		const shouldContinue = searchParams.get("continue") === "true";

		const formData = await event.request.formData();
		try {
			const result = await upsertTransaction({
				userId: user.id,
				shouldContinue,
				formData,
			});
			return result;
		} catch (e) {
			const errorMessage = z
				.object({ message: z.string() })
				.catch({ message: "Something went wrong" })
				.parse(e).message;
			console.error(e);
			return fail(400, { toast: errorMessage });
		}
	},
	"delete-transaction": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}
		const searchParams = event.url.searchParams;
		const transactionId = z.coerce.number().int().min(1).parse(searchParams.get("id"));
		return deleteTransaction({ userId: user.id, transactionId });
	},
};
