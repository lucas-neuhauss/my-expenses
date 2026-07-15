import { categoryCollection } from "$lib/db-collectons/category-collection";
import { transactionCollection } from "$lib/db-collectons/transaction-collection";
import { walletCollection } from "$lib/db-collectons/wallet-collection";
import { and, eq, gte, ilike, lt, or, Query } from "@tanstack/db";

export function buildSearchQuery(o: {
	search: string;
	dateFrom: string;
	dateTo: string;
	categories: number[];
	wallet: number;
	paid: boolean | null;
}) {
	const allTransactions = new Query()
		.from({ transaction: transactionCollection })
		.innerJoin({ wallet: walletCollection }, ({ transaction, wallet }) =>
			eq(transaction.walletId, wallet.id),
		)
		.innerJoin({ category: categoryCollection }, ({ transaction, category }) =>
			eq(transaction.categoryId, category.id),
		)
		.leftJoin(
			{ categoryParent: categoryCollection },
			({ category, categoryParent }) => eq(category.parentId, categoryParent.id),
		)
		.select(({ transaction, wallet, category, categoryParent }) => ({
			id: transaction.id,
			cents: transaction.cents,
			type: transaction.type,
			description: transaction.description,
			date: transaction.date,
			transferenceId: transaction.transferenceId,
			installmentGroupId: transaction.installmentGroupId,
			installmentIndex: transaction.installmentIndex,
			installmentTotal: transaction.installmentTotal,
			subscriptionId: transaction.subscriptionId,
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
		}));

	let filteredTransactions = new Query().from({ transaction: allTransactions });

	// Free-text search on description (case-insensitive)
	if (o.search) {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			ilike(transaction.description, `%${o.search}%`),
		);
	}

	// Date range filter
	if (o.dateFrom) {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			gte(transaction.date, o.dateFrom),
		);
	}
	if (o.dateTo) {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			lt(transaction.date, o.dateTo),
		);
	}

	// Multi-category filter
	if (o.categories.length > 0) {
		filteredTransactions = filteredTransactions.where(({ transaction }) => {
			const conditions = o.categories.map((catId) =>
				or(
					eq(transaction.category.id, catId),
					eq(transaction.categoryParent?.id, catId),
				),
			);
			return conditions.reduce((acc, cond) => or(acc, cond));
		});
	}

	// Wallet filter
	if (o.wallet > 0) {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			eq(transaction.wallet.id, o.wallet),
		);
	}

	// Paid status filter
	if (typeof o.paid === "boolean") {
		filteredTransactions = filteredTransactions.where(({ transaction }) =>
			eq(transaction.paid, o.paid),
		);
	}

	return { allTransactions, filteredTransactions };
}
