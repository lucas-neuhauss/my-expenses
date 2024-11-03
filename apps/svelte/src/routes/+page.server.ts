import { getNestedCategories } from "$lib/server/data/category";
import { deleteTransaction, upsertTransaction } from "$lib/server/data/transaction";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { calculateDashboardData } from "$lib/utils/transaction";
import { fail, redirect } from "@sveltejs/kit";
import { and, desc, eq, gte, lt, or, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}
	const userId = event.locals.user.id;

	const currentMonth = new Date().getMonth() + 1;
	const currentYear = new Date().getFullYear();

	const { month, year } = z
		.object({
			category: z.coerce.number().int().catch(-1),
			wallet: z.coerce.number().int().catch(-1),
			month: z.coerce.number().int().gte(1).lte(12).catch(currentMonth),
			year: z.coerce.number().int().gte(1900).catch(currentYear),
		})
		.parse({
			month: event.url.searchParams.get("month"),
			year: event.url.searchParams.get("year"),
		});

	const date = new Date();
	date.setUTCFullYear(year);
	date.setUTCMonth(month - 1);
	date.setUTCDate(1);
	date.setUTCHours(0, 0, 0, 0);

	const dateMonthLater = new Date();
	dateMonthLater.setUTCFullYear(month === 12 ? year + 1 : year);
	dateMonthLater.setUTCMonth(month === 12 ? 1 : month + 1);
	dateMonthLater.setUTCDate(1);
	dateMonthLater.setUTCHours(0, 0, 0, 0);

	const tableCategoryParent = alias(table.category, "parent");
	const tableTransactionFrom = alias(table.transaction, "from");
	const tableTransactionTo = alias(table.transaction, "to");
	const transactionsPromise = db
		.select({
			id: table.transaction.id,
			cents: table.transaction.cents,
			type: table.transaction.type,
			description: table.transaction.description,
			timestamp: table.transaction.timestamp,
			isTransference: table.transaction.isTransference,
			wallet: {
				id: table.wallet.id,
				name: table.wallet.name,
			},
			category: {
				id: table.category.id,
				title: table.category.title,
				iconName: table.category.iconName,
			},
			categoryParent: {
				id: tableCategoryParent.id,
				title: tableCategoryParent.title,
			},
			transferenceFrom: {
				id: tableTransactionFrom.id,
				walletId: tableTransactionFrom.walletId,
			},
			transferenceTo: {
				id: tableTransactionTo.id,
				walletId: tableTransactionTo.walletId,
			},
		})
		.from(table.transaction)
		.where(
			and(
				eq(table.transaction.userId, userId),
				gte(table.transaction.timestamp, date),
				lt(table.transaction.timestamp, dateMonthLater),
				// category === -1 ? undefined : inArray(table.transaction.categoryId, categoryIds),
				// wallet === -1 ? undefined : eq(table.transaction.walletId, wallet)
			),
		)
		.innerJoin(table.category, eq(table.transaction.categoryId, table.category.id))
		.innerJoin(table.wallet, eq(table.transaction.walletId, table.wallet.id))
		.leftJoin(tableCategoryParent, eq(table.category.parentId, tableCategoryParent.id))
		.leftJoin(
			table.transference,
			or(
				eq(table.transaction.id, table.transference.transactionOutId),
				eq(table.transaction.id, table.transference.transactionInId),
			),
		)
		.leftJoin(
			tableTransactionFrom,
			eq(table.transference.transactionOutId, tableTransactionFrom.id),
		)
		.leftJoin(
			tableTransactionTo,
			eq(table.transference.transactionInId, tableTransactionTo.id),
		)
		.orderBy(desc(table.transaction.timestamp), desc(table.transaction.id));

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
				lt(table.transaction.timestamp, dateMonthLater),
			),
		);

	const [transactions, categories, wallets, balanceResult] = await Promise.all([
		transactionsPromise,
		categoriesPromise,
		walletsPromise,
		balanceResultPromise,
	]);

	const [{ balance }] = z
		.array(z.object({ balance: z.coerce.number().int() }))
		.length(1)
		.catch([{ balance: 0 }])
		.parse(balanceResult);

	const { totalIncome, totalExpense } = calculateDashboardData(transactions);

	return {
		categories,
		wallets,
		balance: balance + wallets.reduce((acc, w) => acc + w.initialBalance, 0),
		transactions,
		totalIncome,
		totalExpense,
		month,
		year,
	};
};

export const actions = {
	"upsert-transaction": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const formData = await event.request.formData();
		await upsertTransaction({
			userId: user.id,
			upsertId: "new",
			formData,
		});
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
