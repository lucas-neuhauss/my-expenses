import type { Transaction } from "$lib/schemas/transaction";
import { describe, expect, it } from "vitest";
import {
	planCreateRows,
	planSimpleUpdate,
	planTransferenceUpdate,
	type TransferenceCategories,
} from "./transaction-plan";

const CATEGORIES: TransferenceCategories = { in: 90, out: 91 };

function expense(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: "new",
		type: "expense",
		wallet: 1,
		category: 2,
		cents: 1050,
		date: "2024-01-15",
		description: "Lunch",
		paid: true,
		...overrides,
	};
}

function create(t: Transaction, today = "2024-06-01") {
	return planCreateRows({
		transaction: t,
		transferenceCategories: CATEGORIES,
		transferenceId: "transfer-1",
		installmentGroupId: "group-1",
		today,
	});
}

describe("planCreateRows", () => {
	it("plans a single negative row for an expense", () => {
		const rows = create(expense());
		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual({
			type: "expense",
			date: "2024-01-15",
			cents: -1050,
			paid: true,
			description: "Lunch",
			walletId: 1,
			categoryId: 2,
			transferenceId: null,
			installmentGroupId: null,
			installmentIndex: null,
			installmentTotal: null,
		});
	});

	it("plans a single positive row for income", () => {
		const rows = create(expense({ type: "income", cents: 5000 }));
		expect(rows[0]?.cents).toBe(5000);
		expect(rows[0]?.type).toBe("income");
	});

	it("plans two linked legs for a transference", () => {
		const rows = create(
			expense({ type: "transference", wallet: 1, toWallet: 2, cents: 5000 }),
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			type: "expense",
			cents: -5000,
			walletId: 1,
			categoryId: 91,
			transferenceId: "transfer-1",
		});
		expect(rows[1]).toMatchObject({
			type: "income",
			cents: 5000,
			walletId: 2,
			categoryId: 90,
			transferenceId: "transfer-1",
		});
	});

	it("splits an installment expense across months", () => {
		const rows = create(
			expense({
				cents: 1000,
				date: "2024-01-31",
				installmentsEnabled: true,
				installmentsCount: 3,
			}),
			"2024-02-15",
		);
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.date)).toEqual(["2024-01-31", "2024-02-29", "2024-03-31"]);
		expect(rows.map((r) => r.cents)).toEqual([-334, -333, -333]);
		expect(rows.reduce((sum, r) => sum + r.cents, 0)).toBe(-1000);
		expect(rows.map((r) => r.installmentIndex)).toEqual([1, 2, 3]);
		expect(rows.every((r) => r.installmentTotal === 3)).toBe(true);
		expect(rows.every((r) => r.installmentGroupId === "group-1")).toBe(true);
		// Only the January installment is already due on 2024-02-15.
		expect(rows.map((r) => r.paid)).toEqual([true, false, false]);
	});

	it("honours an explicit installment split", () => {
		const rows = create(
			expense({
				cents: 1000,
				installmentsEnabled: true,
				installmentsCount: 2,
				installmentsCents: JSON.stringify([700, 300]),
			}),
		);
		expect(rows.map((r) => r.cents)).toEqual([-700, -300]);
	});

	it("marks no installment paid when the parent is unpaid", () => {
		const rows = create(
			expense({
				paid: false,
				installmentsEnabled: true,
				installmentsCount: 2,
				date: "2020-01-01",
			}),
			"2024-06-01",
		);
		expect(rows.every((r) => r.paid === false)).toBe(true);
	});
});

describe("planSimpleUpdate", () => {
	it("negates the cents of an expense and keeps the category", () => {
		expect(planSimpleUpdate(expense({ id: 7, cents: 2000 }))).toEqual({
			date: "2024-01-15",
			cents: -2000,
			paid: true,
			description: "Lunch",
			walletId: 1,
			categoryId: 2,
		});
	});

	it("keeps the cents of income positive", () => {
		expect(planSimpleUpdate(expense({ type: "income", cents: 2000 })).cents).toBe(2000);
	});
});

describe("planTransferenceUpdate", () => {
	it("moves each leg's own wallet and sign", () => {
		const plan = planTransferenceUpdate(
			expense({ type: "transference", wallet: 1, toWallet: 2, cents: 3000 }),
		);
		expect(plan.expense).toEqual({
			date: "2024-01-15",
			cents: -3000,
			paid: true,
			description: "Lunch",
			walletId: 1,
		});
		expect(plan.income.walletId).toBe(2);
		expect(plan.income.cents).toBe(3000);
	});
});
