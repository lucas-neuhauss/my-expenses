import type { Transaction } from "$lib/server/db/schema";
import { getRandomColor } from "$lib/utils/color";
import dayjs from "dayjs";

export function calculateDashboardData(
	transactions: Array<
		Pick<Transaction, "id" | "type" | "cents" | "isTransference" | "timestamp"> & {
			category: { id: number; title: string };
			categoryParent: { id: number; title: string } | null;
		}
	>,
): {
	totalIncome: number;
	totalExpense: number;
	expenseDonutData: any[];
	incomeDonutData: any[];
	areaChartData: any;
} {
	let totalExpense = 0;
	let totalIncome = 0;
	let expenseDonutData: any[] = [];
	let incomeDonutData: any[] = [];
	const areaChartDataMap = new Map<
		string,
		{
			Income: number | null;
			Expense: number | null;
		}
	>();
	const daysInMonth = dayjs().daysInMonth();
	Array(daysInMonth)
		.fill(null)
		.forEach((_, index) => {
			if (index === 0) {
				areaChartDataMap.set("1", {
					Income: 0,
					Expense: 0,
				});
			} else if (index === daysInMonth - 1) {
				areaChartDataMap.set(String(daysInMonth), {
					Income: 0,
					Expense: 0,
				});
			} else {
				areaChartDataMap.set(String(index + 1), {
					Income: null,
					Expense: null,
				});
			}
		});

	transactions.forEach((t) => {
		const category = t.categoryParent ?? t.category;

		if (t.type === "income" && !t.isTransference) {
			totalIncome += t.cents;
			const index = incomeDonutData.findIndex((cell) => cell.name === category.title);
			if (index === -1) {
				incomeDonutData.push({
					name: category.title,
					value: t.cents,
					color: getRandomColor(),
				});
			} else {
				incomeDonutData[index].value += t.cents;
			}

			const day = dayjs(t.timestamp).format("D");
			const values = areaChartDataMap.get(day);
			areaChartDataMap.set(day, {
				Income: (values?.Income ?? 0) + t.cents,
				Expense: values?.Expense ?? null,
			});
		} else if (t.type === "expense" && !t.isTransference) {
			totalExpense += t.cents;
			const index = expenseDonutData.findIndex((cell) => cell.name === category.title);
			if (index === -1) {
				expenseDonutData.push({
					name: category.title,
					value: t.cents * -1,
					color: getRandomColor(),
				});
			} else {
				expenseDonutData[index].value += t.cents * -1;
			}

			const day = dayjs(t.timestamp).format("D");
			const values = areaChartDataMap.get(day);
			areaChartDataMap.set(day, {
				Income: values?.Income ?? null,
				Expense: (values?.Expense ?? 0) - t.cents,
			});
		}
	});

	expenseDonutData.sort((a, b) => b.value - a.value);
	incomeDonutData.sort((a, b) => b.value - a.value);
	const areaChartData = (() => {
		const arr: any[] = [];
		areaChartDataMap.forEach((value, key) => {
			arr.push({
				date: `${dayjs().format("MMM")} ${key}`,
				Income: value.Income,
				Expense: value.Expense,
			});
		});
		return arr;
	})();

	if (expenseDonutData.length > 5) {
		expenseDonutData = expenseDonutData.slice(0, 5).concat([
			{
				name: "Others",
				value: expenseDonutData.slice(5).reduce((acc, c) => acc + c.value, 0),
				color: getRandomColor(),
			},
		]);
	}
	if (incomeDonutData.length > 5) {
		incomeDonutData = incomeDonutData.slice(0, 5).concat([
			{
				name: "Others",
				value: incomeDonutData.slice(5).reduce((acc, c) => acc + c.value, 0),
				color: getRandomColor(),
			},
		]);
	}

	return {
		totalExpense,
		totalIncome,
		expenseDonutData,
		incomeDonutData,
		areaChartData,
	};
}
