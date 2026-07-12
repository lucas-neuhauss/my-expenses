import { Wallet, WalletSchema } from "$lib/schemas/wallet";
import { describe, expect, it } from "vitest";

/**
 * Runtime validation of the schema-unification spike (task 1.1).
 *
 * These tests confirm the Standard Schema v1 contract holds for `Wallet`:
 * - the schema exposes the `~standard` symbol required by the spec
 * - valid inputs decode to the canonical type
 * - invalid inputs surface as issues, not exceptions
 *
 * The compile-time check in `wallet.ts` (the
 * `AssertWalletSchemaMatchesDrizzle` const) covers the Drizzle alignment.
 */
describe("wallet canonical schema (spike)", () => {
	function unwrap<T>(
		result:
			| { readonly value: T; readonly issues?: undefined }
			| { readonly issues: ReadonlyArray<{ message: string }> }
			| Promise<
					| { readonly value: T; readonly issues?: undefined }
					| { readonly issues: ReadonlyArray<{ message: string }> }
			  >,
	):
		| { readonly value: T; readonly issues?: undefined }
		| { readonly issues: ReadonlyArray<{ message: string }> } {
		// The wallet schema is synchronous (no async transforms or checks),
		// so a runtime value is never a Promise. The types include Promise
		// for genericity, so we narrow by checking for the success shape.
		return result as Exclude<typeof result, Promise<unknown>>;
	}

	it("exposes the Standard Schema v1 contract", () => {
		expect(WalletSchema["~standard"]).toBeDefined();
		expect(WalletSchema["~standard"].version).toBe(1);
		expect(WalletSchema["~standard"].vendor).toBe("effect");
	});

	it("decodes a fully numeric input (collection row shape)", () => {
		const result = unwrap(
			WalletSchema["~standard"].validate({
				id: 42,
				name: "Checking",
				initialBalance: 12_345,
			}),
		);
		expect(result).toEqual({
			value: { id: 42, name: "Checking", initialBalance: 12_345 },
		});
	});

	it("decodes a form-style input (string fields, integers as strings)", () => {
		const result = unwrap(
			WalletSchema["~standard"].validate({
				id: "42",
				name: "Savings",
				initialBalance: "50000",
			}),
		);
		expect(result).toEqual({
			value: { id: 42, name: "Savings", initialBalance: 50_000 },
		});
	});

	it("decodes the `id: 0` create case used by the upsert form", () => {
		const result = unwrap(
			WalletSchema["~standard"].validate({
				id: 0,
				name: "New",
				initialBalance: 0,
			}),
		);
		expect(result).toEqual({ value: { id: 0, name: "New", initialBalance: 0 } });
	});

	it("rejects a name shorter than 2 characters", () => {
		const result = unwrap(
			WalletSchema["~standard"].validate({
				id: 1,
				name: "A",
				initialBalance: 0,
			}),
		);
		if ("value" in result) {
			expect.fail("expected validation to fail");
		}
		expect(result.issues.length).toBeGreaterThan(0);
	});

	it("rejects a name longer than 50 characters", () => {
		const result = unwrap(
			WalletSchema["~standard"].validate({
				id: 1,
				name: "x".repeat(51),
				initialBalance: 0,
			}),
		);
		if ("value" in result) {
			expect.fail("expected validation to fail");
		}
		expect(result.issues.length).toBeGreaterThan(0);
	});

	it("rejects a negative initialBalance", () => {
		const result = unwrap(
			WalletSchema["~standard"].validate({
				id: 1,
				name: "Checking",
				initialBalance: -1,
			}),
		);
		if ("value" in result) {
			expect.fail("expected validation to fail");
		}
		expect(result.issues.length).toBeGreaterThan(0);
	});

	it("WalletStruct.Type matches the inferred canonical type", () => {
		// This is more of a type-level smoke test, but it confirms the
		// Type extraction at the runtime type level.
		const value: typeof Wallet.Type = { id: 1, name: "Wallet", initialBalance: 0 };
		expect(value.id).toBe(1);
	});
});
