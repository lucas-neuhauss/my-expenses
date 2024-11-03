import type { Transaction } from "$lib/server/db/schema";

export function calculateDashboardData(
	transactions: Array<
		Pick<Transaction, "id" | "type" | "cents" | "isTransference" | "date"> & {
			category: { id: number; title: string };
			categoryParent: { id: number; title: string } | null;
		}
	>,
): {
	totalIncome: number;
	totalExpense: number;
} {
	let totalExpense = 0;
	let totalIncome = 0;

	transactions.forEach((t) => {
		if (t.type === "income" && !t.isTransference) {
			totalIncome += t.cents;
		} else if (t.type === "expense" && !t.isTransference) {
			totalExpense += t.cents;
		}
	});

	return {
		totalExpense,
		totalIncome,
	};
}
