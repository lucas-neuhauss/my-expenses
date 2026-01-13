import { categoryCollection } from "$lib/db-collectons/category-collection";
import { transactionCollection } from "$lib/db-collectons/transaction-collection";
import { walletCollection } from "$lib/db-collectons/wallet-collection";
import { and, eq, gte, lt, or, Query, sum } from "@tanstack/db";

export function buildTransactionsQuery(o: {
	paid: boolean | null;
	wallet: number;
	category: number;
	month: number;
	year: number;
}) {
	const monthStr = String(o.month).padStart(2, "0");
	const startDate = `${o.year}-${monthStr}-01`;

	// Calculate end date (first day of next month)
	const nextMonth = o.month === 12 ? 1 : o.month + 1;
	const nextYear = o.month === 12 ? o.year + 1 : o.year;
	const nextMonthStr = String(nextMonth).padStart(2, "0");
	const endDate = `${nextYear}-${nextMonthStr}-01`;

	const allTransactions = new Query()
		.from({ transaction: transactionCollection })
		.innerJoin({ wallet: walletCollection }, ({ transaction, wallet }) =>
			eq(transaction.walletId, wallet.id),
		)
		.innerJoin({ category: categoryCollection }, ({ transaction, category }) =>
			eq(transaction.categoryId, category.id),
		)
		.leftJoin({ categoryParent: categoryCollection }, ({ category, categoryParent }) =>
			eq(category.parentId, categoryParent.id),
		)
		.select(({ transaction, wallet, category, categoryParent }) => ({
			id: transaction.id,
			cents: transaction.cents,
			type: transaction.type,
			description: transaction.description,
			date: transaction.date,
			transferenceId: transaction.transferenceId,
			paid: transaction.paid,
			wallet: {
				id: wallet.id,
				name: wallet.name,
			},
			category: {
				id: category.id,
				name: category.name,
				icon: category.icon,
			},
			categoryParent: {
				id: categoryParent?.id,
				name: categoryParent?.name,
			},
			transferenceFrom: transaction.transferenceFrom,
			transferenceTo: transaction.transferenceTo,
		}))
		.where(({ transaction }) => gte(transaction.date, startDate))
		.where(({ transaction }) => lt(transaction.date, endDate));

	let filteredTransactions = new Query().from({ transaction: allTransactions });

	if (typeof o.paid === "boolean") {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			eq(transaction.paid, o.paid),
		);
	}
	if (o.wallet > 0) {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			eq(transaction.wallet.id, o.wallet),
		);
	}
	if (o.category > 0) {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			or(
				eq(transaction.category.id, o.category),
				eq(transaction.categoryParent?.id, o.category),
			),
		);
	}

	return { allTransactions, filteredTransactions };
}

export function buildBalanceQuery(o: { month: number; year: number }) {
	// Calculate end date (first day of next month)
	const nextMonth = o.month === 12 ? 1 : o.month + 1;
	const nextYear = o.month === 12 ? o.year + 1 : o.year;
	const nextMonthStr = String(nextMonth).padStart(2, "0");
	const endDate = `${nextYear}-${nextMonthStr}-01`;

	const query = new Query()
		.from({ transaction: transactionCollection })
		.select(({ transaction }) => ({ sum: sum(transaction.cents) }))
		.where(({ transaction }) =>
			and(lt(transaction.date, endDate), eq(transaction.paid, true)),
		);

	return query;
}
