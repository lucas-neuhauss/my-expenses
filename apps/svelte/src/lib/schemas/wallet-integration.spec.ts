/**
 * Type-level smoke test for the schema-unification spike (task 1.1).
 *
 * This file exists at the *type* level: if it compiles, the canonical
 * `WalletSchema` is acceptable to SvelteKit's `form()` (which is
 * generic over `StandardSchemaV1`) and is therefore also acceptable to
 * any other library that takes a `StandardSchemaV1` — including
 * TanStack DB's `queryCollectionOptions` (whose first overload is
 * generic over `T extends StandardSchemaV1`).
 *
 * If the derivation chain ever stops producing a valid Standard
 * Schema v1, this file will fail to type-check.
 *
 * No runtime checks live here — the runtime behavior is covered in
 * `wallet.spec.ts`.
 */
import { form } from "$app/server";
import { WalletSchema } from "$lib/schemas/wallet";
import { describe, it } from "vitest";

describe("wallet schema integration (type-level)", () => {
	// SvelteKit's `form()` is generic over `StandardSchemaV1`. We pass
	// our schema to it; if the schema is not a valid `StandardSchemaV1`,
	// this call fails to type-check. The assertion is the type-check
	// itself, not the runtime behavior.
	it("WalletSchema is accepted by SvelteKit's form()", () => {
		const _walletForm = form(WalletSchema, async () => "noop");
		void _walletForm;
	});
});
