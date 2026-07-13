import { describe, expect, it } from "vitest";
import { calculateDashboardData } from "./transaction";

describe("calculateDashboardData", () => {
	it("aggregates income and expense correctly with no filters", () => {
		const transactions = [
			{
				id: 1,
				type: "income" as const,
				cents: 5000,
				transferenceId: null,
				paid: true,
				date: "2024-01-15",
				category: { id: 1, name: "Salary" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
			{
				id: 2,
				type: "expense" as const,
				cents: -1500,
				transferenceId: null,
				paid: true,
				date: "2024-01-16",
				category: { id: 2, name: "Food" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
			{
				id: 3,
				type: "income" as const,
				cents: 2000,
				transferenceId: null,
				paid: true,
				date: "2024-01-20",
				category: { id: 1, name: "Salary" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
		];

		const result = calculateDashboardData(transactions, -1, -1);

		expect(result.totalIncome).toBe(7000);
		expect(result.totalExpense).toBe(-1500);
		expect(result.filteredIncome).toBe(7000);
		expect(result.filteredExpense).toBe(-1500);
	});

	it("filters by wallet", () => {
		const transactions = [
			{
				id: 1,
				type: "income" as const,
				cents: 5000,
				transferenceId: null,
				paid: true,
				date: "2024-01-15",
				category: { id: 1, name: "Salary" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
			{
				id: 2,
				type: "income" as const,
				cents: 3000,
				transferenceId: null,
				paid: true,
				date: "2024-01-15",
				category: { id: 1, name: "Salary" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 2, name: "Savings" },
			},
		];

		const result = calculateDashboardData(transactions, 2, -1);

		expect(result.totalIncome).toBe(8000);
		expect(result.filteredIncome).toBe(3000);
	});

	it("filters by category", () => {
		const transactions = [
			{
				id: 1,
				type: "expense" as const,
				cents: -1500,
				transferenceId: null,
				paid: true,
				date: "2024-01-16",
				category: { id: 2, name: "Food" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
			{
				id: 2,
				type: "expense" as const,
				cents: -2000,
				transferenceId: null,
				paid: true,
				date: "2024-01-17",
				category: { id: 3, name: "Transport" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
		];

		const result = calculateDashboardData(transactions, -1, 2);

		expect(result.totalExpense).toBe(-3500);
		expect(result.filteredExpense).toBe(-1500);
	});

	it("filters using categoryParent when categoryFilter matches parent", () => {
		const transactions = [
			{
				id: 1,
				type: "expense" as const,
				cents: -1500,
				transferenceId: null,
				paid: true,
				date: "2024-01-16",
				category: { id: 2, name: "Food" },
				categoryParent: { id: 10, name: "Essentials" },
				wallet: { id: 1, name: "Checking" },
			},
		];

		const result = calculateDashboardData(transactions, -1, 10);

		expect(result.filteredExpense).toBe(-1500);
	});

	it("excludes transfers from pie chart data and totals", () => {
		const transactions = [
			{
				id: 1,
				type: "expense" as const,
				cents: -5000,
				transferenceId: "transfer-1",
				paid: true,
				date: "2024-01-15",
				category: { id: 1, name: "Transfer Out" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
			{
				id: 2,
				type: "income" as const,
				cents: 5000,
				transferenceId: "transfer-1",
				paid: true,
				date: "2024-01-15",
				category: { id: 2, name: "Transfer In" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 2, name: "Savings" },
			},
			{
				id: 3,
				type: "expense" as const,
				cents: -1000,
				transferenceId: null,
				paid: true,
				date: "2024-01-16",
				category: { id: 3, name: "Food" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
		];

		const result = calculateDashboardData(transactions, -1, -1);

		// totalExpense/totalIncome exclude transfers (transferenceId !== null)
		expect(result.totalExpense).toBe(-1000);
		expect(result.totalIncome).toBe(0);

		// Charts exclude transfers
		expect(result.charts.expensePieChartData).toHaveLength(1);
		expect(result.charts.expensePieChartData[0].name).toBe("Food");
		expect(result.charts.incomePieChartData).toHaveLength(0);

		// Filtered totals include all paid transactions matching filters (including transfers)
		expect(result.filteredExpense).toBe(-6000);
		expect(result.filteredIncome).toBe(5000);
	});

	it("limits pie chart to top 10 categories plus 'Others'", () => {
		const transactions = Array.from({ length: 15 }, (_, i) => ({
			id: i + 1,
			type: "expense" as const,
			cents: -(i + 1) * 100,
			transferenceId: null as string | null,
			paid: true,
			date: "2024-01-15",
			category: { id: i + 1, name: `Category ${i + 1}` },
			categoryParent: { id: undefined, name: undefined },
			wallet: { id: 1, name: "Checking" },
		}));

		const result = calculateDashboardData(transactions, -1, -1);

		expect(result.charts.expensePieChartData).toHaveLength(11);
		expect(result.charts.expensePieChartData[10].name).toBe("Others");
	});

	it("does not include unpaid transactions in totals", () => {
		const transactions = [
			{
				id: 1,
				type: "expense" as const,
				cents: -1000,
				transferenceId: null,
				paid: false,
				date: "2024-01-15",
				category: { id: 1, name: "Food" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
			{
				id: 2,
				type: "expense" as const,
				cents: -2000,
				transferenceId: null,
				paid: true,
				date: "2024-01-16",
				category: { id: 2, name: "Rent" },
				categoryParent: { id: undefined, name: undefined },
				wallet: { id: 1, name: "Checking" },
			},
		];

		const result = calculateDashboardData(transactions, -1, -1);

		expect(result.totalExpense).toBe(-2000);
		expect(result.filteredExpense).toBe(-2000);
		expect(result.charts.expensePieChartData).toHaveLength(1);
		expect(result.charts.expensePieChartData[0].name).toBe("Rent");
	});
});
