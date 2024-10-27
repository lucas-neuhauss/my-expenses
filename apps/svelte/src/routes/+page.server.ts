import { z } from 'zod';
import { redirect, fail } from '@sveltejs/kit';
import { and, desc, eq, gte, lt, or } from 'drizzle-orm';
import * as table from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { alias } from 'drizzle-orm/pg-core';
import { upsertTransaction } from '$lib/server/data/transaction';

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, '/login');
	}

	const userId = event.locals.user.id;

	const url = new URL(event.request.url);
	const searchParamsObj = Object.fromEntries(url.searchParams);
	const currentMonth = new Date().getMonth();
	const currentYear = new Date().getFullYear();
	const { month, year } = z
		.object({
			category: z.coerce.number().int().catch(-1),
			wallet: z.coerce.number().int().catch(-1),
			month: z.coerce.number().int().gte(0).lte(11).catch(currentMonth),
			year: z.coerce.number().int().gte(1900).catch(currentYear)
		})
		.parse(searchParamsObj);

	const date = new Date();
	date.setUTCFullYear(year);
	date.setUTCMonth(month);
	date.setUTCDate(1);
	date.setUTCHours(0, 0, 0, 0);

	const dateMonthLater = new Date();
	dateMonthLater.setUTCFullYear(month === 11 ? year + 1 : year);
	dateMonthLater.setUTCMonth(month === 11 ? 0 : month + 1);
	dateMonthLater.setUTCDate(1);
	dateMonthLater.setUTCHours(0, 0, 0, 0);

	const tableCategoryParent = alias(table.category, 'parent');
	const tableTransactionFrom = alias(table.transaction, 'from');
	const tableTransactionTo = alias(table.transaction, 'to');
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
				name: table.wallet.name
			},
			category: {
				id: table.category.id,
				title: table.category.title,
				iconName: table.category.iconName
			},
			categoryParent: {
				id: tableCategoryParent.id,
				title: tableCategoryParent.title
			},
			transferenceFrom: {
				id: tableTransactionFrom.id,
				walletId: tableTransactionFrom.walletId
			},
			transferenceTo: {
				id: tableTransactionTo.id,
				walletId: tableTransactionTo.walletId
			}
		})
		.from(table.transaction)
		.where(
			and(
				eq(table.transaction.userId, userId),
				gte(table.transaction.timestamp, date),
				lt(table.transaction.timestamp, dateMonthLater)
				// category === -1 ? undefined : inArray(table.transaction.categoryId, categoryIds),
				// wallet === -1 ? undefined : eq(table.transaction.walletId, wallet)
			)
		)
		.innerJoin(table.category, eq(table.transaction.categoryId, table.category.id))
		.innerJoin(table.wallet, eq(table.transaction.walletId, table.wallet.id))
		.leftJoin(tableCategoryParent, eq(table.category.parentId, tableCategoryParent.id))
		.leftJoin(
			table.transference,
			or(
				eq(table.transaction.id, table.transference.transactionOutId),
				eq(table.transaction.id, table.transference.transactionInId)
			)
		)
		.leftJoin(
			tableTransactionFrom,
			eq(table.transference.transactionOutId, tableTransactionFrom.id)
		)
		.leftJoin(tableTransactionTo, eq(table.transference.transactionInId, tableTransactionTo.id))
		.orderBy(desc(table.transaction.timestamp), desc(table.transaction.id));

	const [transactions] = await Promise.all([transactionsPromise]);
	return {
		transactions
	};
};

export const actions = {
	'upsert-transaction': async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const formData = await event.request.formData();
		await upsertTransaction({
			userId: user.id,
			upsertId: 'new',
			formData
		});
	}
};
