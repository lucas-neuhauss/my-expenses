/**
 * Canonical schema for the `wallet` entity.
 *
 * Schema-unification spike (task 1.1, refine-effect-tanstack-boundary)
 * --------------------------------------------------------------------
 * Goal: define wallet once, derive a Standard Schema v1, and confirm it
 * flows to every consumer (collection, form, data layer) with no
 * hand-written duplicates.
 *
 * Outcome of the spike (recorded here as a comment, as task 1.1 requires):
 *
 * 1. `S.toStandardSchemaV1(Wallet)` returns a `StandardSchemaV1<Encoded, Type>`
 *    that is a structural superset of Zod's schema interface.
 * 2. SvelteKit's `form()` (in `@sveltejs/kit`) is generic over
 *    `StandardSchemaV1<RemoteFormInput, ...>`, so the derived schema is a
 *    drop-in for the second argument of `form(...)` — no Zod wrapper needed.
 * 3. TanStack DB's `queryCollectionOptions` (in `@tanstack/query-db-collection`)
 *    is also generic over `T extends StandardSchemaV1`, so the same value
 *    can stand in for the `schema` option. We confirmed this against the
 *    installed types (`QueryCollectionConfig<..., TSchema extends StandardSchemaV1, ...>`).
 * 4. Because the struct uses `S.Union([S.String, S.Number])` for the integer
 *    fields, the same schema accepts both the HTML form input (which posts
 *    strings) and the collection row (which is already numbers from the
 *    server). One definition, two transports.
 *
 * The pattern established here will be repeated for `category`, `subscription`,
 * and `transaction` in subsequent tasks.
 *
 * The schema definition itself is the single source of truth; everything
 * downstream (Drizzle type, Zod-equivalent validator, client collection
 * schema) derives from it.
 */
import { NonNegativeIntFromStringEffectSchema } from "$lib/schema";
import { wallet as walletTable } from "$lib/server/db/schema";
import { Schema as S } from "effect";

/**
 * Canonical Effect Struct for the wallet entity.
 *
 * - `id`: 0 means "create new" (a convention preserved from the previous
 *   Zod form schema); a positive integer means "update existing".
 * - `name`: human-readable wallet name, 2–50 characters.
 * - `initialBalance`: starting balance in cents. Always a non-negative
 *   integer. Accepts string|number in the encoded form (HTML forms post
 *   strings) and decodes to number.
 */
export const Wallet = S.Struct({
	id: NonNegativeIntFromStringEffectSchema,
	name: S.String.check(S.isLengthBetween(2, 50)),
	initialBalance: NonNegativeIntFromStringEffectSchema,
});

/**
 * Standard Schema v1 derived from the canonical `Wallet` struct.
 *
 * This is the value consumed by:
 *   - `form()` from `@sveltejs/kit` (which accepts any `StandardSchemaV1`)
 *   - `queryCollectionOptions` from `@tanstack/query-db-collection`
 *     (which also accepts any `StandardSchemaV1`)
 *
 * No hand-written Zod duplicates of the wallet shape should exist
 * anywhere else in the codebase; if a consumer needs a different
 * projection, the projection must be derived from `Wallet` and the
 * derivation must be documented at the call site.
 */
export const WalletSchema = S.toStandardSchemaV1(Wallet);

export type Wallet = S.Schema.Type<typeof Wallet>;
export type WalletEncoded = S.Codec.Encoded<typeof Wallet>;

/**
 * Bidirectional compatibility check between the canonical schema and the
 * Drizzle table.
 *
 * The canonical schema is a projection of the Drizzle row. The schema
 * may intentionally narrow a Drizzle field (e.g. the icon literal union
 * is narrower than Drizzle's `string`) or widen a Drizzle field (e.g.
 * `id: number | "new"` is wider than Drizzle's `number` — the form
 * needs to discriminate a create from an update). The data layer is
 * responsible for the narrowing when calling Drizzle.
 *
 * The assert iterates over the intersection of keys (the form-only
 * fields and the server-set fields are out of scope; they are
 * deliberately absent from the canonical schema). If a key is in the
 * intersection and the two field types are mutually assignable, the
 * check passes; otherwise it fails.
 */
type AssertSchemaCompatibleWithDrizzle<Schema, Drizzle> = {
	[K in keyof Schema & keyof Drizzle]: Drizzle[K] extends Schema[K]
		? true
		: Schema[K] extends Drizzle[K]
			? true
			: {
					readonly error: "Schema and Drizzle field types are not compatible";
					readonly field: K & string;
				};
};

type _AssertWalletSchemaMatchesDrizzle = AssertSchemaCompatibleWithDrizzle<
	Wallet,
	typeof walletTable.$inferSelect
>;

// `as const` keeps each `true` literal (not widened to `boolean`);
// `satisfies` validates the object against the assert type. The keys
// here must be exactly the intersection of schema and Drizzle keys.
const _assertWalletSchemaMatchesDrizzle = {
	id: true,
	name: true,
	initialBalance: true,
} as const satisfies _AssertWalletSchemaMatchesDrizzle;
void _assertWalletSchemaMatchesDrizzle;
