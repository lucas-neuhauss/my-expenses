import type { Transaction } from "$lib/server/db/schema";
import type { PieChartDataItem } from "./charts";

const CHARTS_LIMIT = 10;

export function calculateDashboardData(
	transactions: Array<
		Pick<Transaction, "id" | "type" | "cents" | "transferenceId" | "paid" | "date"> & {
			category: { id: number; name: string };
			categoryParent: { id: number; name: string } | null;
		}
	>,
) {
	let totalExpense = 0;
	let totalIncome = 0;
	let expensePieChartData: PieChartDataItem[] = [];
	let incomePieChartData: PieChartDataItem[] = [];

	transactions.forEach((t) => {
		const category = t.categoryParent ?? t.category;

		if (t.type === "income" && t.transferenceId === null && t.paid) {
			totalIncome += t.cents;
			const index = incomePieChartData.findIndex((cell) => cell.name === category.name);
			if (index === -1) {
				incomePieChartData.push({
					id: category.id,
					name: category.name,
					value: t.cents,
					// color: getRandomColor(),
				});
			} else {
				incomePieChartData[index].value += t.cents;
			}
		} else if (t.type === "expense" && t.transferenceId === null && t.paid) {
			totalExpense += t.cents;
			const index = expensePieChartData.findIndex((cell) => cell.name === category.name);
			if (index === -1) {
				expensePieChartData.push({
					id: category.id,
					name: category.name,
					value: t.cents * -1,
					// color: getRandomColor(),
				});
			} else {
				expensePieChartData[index].value += t.cents * -1;
			}
		}
	});

	// Sort data
	expensePieChartData.sort((a, b) => b.value - a.value);
	incomePieChartData.sort((a, b) => b.value - a.value);

	if (expensePieChartData.length > CHARTS_LIMIT) {
		expensePieChartData = expensePieChartData.slice(0, CHARTS_LIMIT).concat([
			{
				name: "Others",
				value: expensePieChartData
					.slice(CHARTS_LIMIT)
					.reduce((acc, c) => acc + c.value, 0),
				// color: getRandomColor(),
			},
		]);
	}
	if (incomePieChartData.length > CHARTS_LIMIT) {
		incomePieChartData = incomePieChartData.slice(0, CHARTS_LIMIT).concat([
			{
				name: "Others",
				value: incomePieChartData
					.slice(CHARTS_LIMIT)
					.reduce((acc, c) => acc + c.value, 0),
				// color: getRandomColor(),
			},
		]);
	}

	return {
		totalExpense,
		totalIncome,
		charts: {
			expensePieChartData,
			incomePieChartData,
		},
	};
}
