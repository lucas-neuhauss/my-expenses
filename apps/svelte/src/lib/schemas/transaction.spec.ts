import { TransactionSchema, type Transaction } from "$lib/schemas/transaction";
import { describe, expect, it } from "vitest";

/**
 * Runtime validation of the canonical transaction schema.
 *
 * These tests pin the cross-field coherence rules that used to live in the
 * data layer's Zod `superRefine`:
 * - same-wallet transfer
 * - category required for income/expense, `toWallet` for transference
 * - installment count bounds and cents-sum equality
 * - empty description decodes to `null`
 */

function validate(input: Record<string, unknown>): Transaction {
	const result = TransactionSchema["~standard"].validate(input) as
		| { value: Transaction; issues?: undefined }
		| { issues: ReadonlyArray<{ message: string }> };
	if (!("value" in result)) {
		throw new Error(result.issues[0]?.message ?? "validation failed");
	}
	return result.value;
}

function issues(input: Record<string, unknown>): ReadonlyArray<{ message: string }> {
	const result = TransactionSchema["~standard"].validate(input) as
		| { value: Transaction; issues?: undefined }
		| { issues: ReadonlyArray<{ message: string }> };
	if ("value" in result) {
		throw new Error("expected validation to fail");
	}
	return result.issues;
}

const base = {
	id: "new",
	type: "expense",
	wallet: "1",
	category: "2",
	cents: "10.50",
	date: "2024-01-15",
	description: "Lunch",
	paid: "true",
};

describe("transaction canonical schema", () => {
	it("decodes a simple expense to integer cents", () => {
		const value = validate(base);
		expect(value).toEqual({
			id: "new",
			type: "expense",
			wallet: 1,
			category: 2,
			cents: 1050,
			date: "2024-01-15",
			description: "Lunch",
			paid: true,
		});
	});

	it("decodes an empty description to null", () => {
		expect(validate({ ...base, description: "" }).description).toBeNull();
		expect(validate({ ...base, description: "   " }).description).toBeNull();
	});

	it("decodes a transference", () => {
		const value = validate({
			id: "new",
			type: "transference",
			wallet: "1",
			toWallet: "2",
			cents: "50.00",
			date: "2024-01-15",
			description: "",
			paid: "false",
		});
		expect(value.wallet).toBe(1);
		expect(value.toWallet).toBe(2);
		expect(value.cents).toBe(5000);
		expect(value.paid).toBe(false);
	});

	it("rejects a transfer to the same wallet", () => {
		expect(
			issues({
				id: "new",
				type: "transference",
				wallet: "1",
				toWallet: "1",
				cents: "50.00",
				date: "2024-01-15",
				description: "",
				paid: "false",
			})[0]?.message,
		).toBe("Cannot transfer to the same wallet");
	});

	it("requires a category for an expense", () => {
		const { category: _category, ...withoutCategory } = base;
		expect(issues(withoutCategory)[0]?.message).toBe("Category is required");
	});

	it("requires toWallet for a transference", () => {
		expect(
			issues({
				id: "new",
				type: "transference",
				wallet: "1",
				cents: "50.00",
				date: "2024-01-15",
				description: "",
				paid: "false",
			})[0]?.message,
		).toBe("Destination wallet is required");
	});

	it("rejects an installment count below 2", () => {
		expect(
			issues({
				...base,
				installmentsEnabled: "true",
				installmentsCount: "1",
			})[0]?.message,
		).toBe("Installments count must be between 2 and 24");
	});

	it("rejects installments whose cents do not sum to the total", () => {
		expect(
			issues({
				...base,
				cents: "10.00",
				installmentsEnabled: "true",
				installmentsCount: "3",
				installmentsCents: JSON.stringify([400, 400, 400]),
			})[0]?.message,
		).toBe("Installment sum (1200) must equal total (1000)");
	});

	it("rejects installments whose length does not match the count", () => {
		expect(
			issues({
				...base,
				cents: "10.00",
				installmentsEnabled: "true",
				installmentsCount: "3",
				installmentsCents: JSON.stringify([500, 500]),
			})[0]?.message,
		).toBe("Installment cents array length must match count");
	});

	it("accepts installments whose cents sum to the total", () => {
		const value = validate({
			...base,
			cents: "10.00",
			installmentsEnabled: "true",
			installmentsCount: "3",
			installmentsCents: JSON.stringify([334, 333, 333]),
		});
		expect(value.cents).toBe(1000);
		expect(value.installmentsCount).toBe(3);
	});
});
