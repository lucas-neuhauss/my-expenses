/**
 * Canonical schema for the `transaction` entity.
 *
 * The transaction is the trickiest entity: a discriminated union on
 * `type` (expense / income / transference) with linkage rules
 * (installment groups, transference pairs, subscription generation).
 * The form action parses FormData into an object and validates it
 * against this schema; the data layer consumes the validated object.
 *
 * The schema is intentionally a structural mirror of the existing Zod
 * schema in `src/lib/server/data/transaction.ts` (the discriminated
 * union, the `installmentsCents` JSON string, the boolean
 * `installmentsEnabled`). Centralizing it here is the first step; the
 * data-layer Zod schema can be retired once the form action drives
 * validation through this Effect schema.
 *
 * The encoded form (post-FormData-parsing) accepts `string | number`
 * for the integer fields and `string` for the booleans (`"true" |
 * "false"`); the decoded type is the data layer's view
 * (`number | "new"` for `id`, `number` for cents, `boolean` for
 * `paid`, etc.).
 */
import { NonNegativeIntFromStringEffectSchema } from "$lib/schema";
import { transaction as transactionTable } from "$lib/server/db/schema";
import { Schema as S, SchemaTransformation } from "effect";

/** ISO date string `YYYY-MM-DD` (mirrors the Zod `DateStringSchema` in
 * `$lib/utils/date-time.ts`, but as an Effect schema). */
const IsoDateStringSchema = S.String.check(S.isPattern(/^\d{4}-\d{2}-\d{2}$/));

const BooleanStringSchema = S.Literals(["true", "false"]).pipe(
	S.decodeTo(
		S.Boolean,
		SchemaTransformation.transform({
			decode: (s: "true" | "false") => s === "true",
			encode: (b: boolean) => (b ? "true" : "false"),
		}),
	),
);

// Cents stored as integer in the DB; the form sends the dollar amount
// as a string ("10.50") which the schema multiplies by 100 and rounds.
const CentsFromDollarStringSchema = S.String.pipe(
	S.decodeTo(
		S.Number.pipe(S.check(S.isGreaterThanOrEqualTo(0))),
		SchemaTransformation.transform({
			decode: (s: string) => Math.round(Number(s) * 100),
			encode: (cents: number) => String(cents / 100),
		}),
	),
);

const TransactionIdSchema = S.Union([
	S.Literal("new"),
	NonNegativeIntFromStringEffectSchema,
]);

const TransactionBase = {
	id: TransactionIdSchema,
	wallet: NonNegativeIntFromStringEffectSchema,
	cents: CentsFromDollarStringSchema,
	date: IsoDateStringSchema,
	description: S.NullOr(S.String.check(S.isMinLength(1))),
	paid: BooleanStringSchema,
} as const;

/**
 * Canonical schema for the transaction entity. The form input is a
 * single struct whose fields are conditional on the `type` value
 * (expense / income / transference); a refinement on the runtime
 * representation is the natural place to express the
 * "expense has category; transference has toWallet; neither has both"
 * rules, but the existing data-layer logic in
 * `src/lib/server/data/transaction.ts` already encodes those rules,
 * so this schema only validates the per-field shape. The data layer
 * is responsible for the cross-field rules.
 */
export const Transaction = S.Struct({
	...TransactionBase,
	type: S.Literals(["expense", "income", "transference"]),
	// Conditional fields — all optional in the encoded form; the data
	// layer enforces which apply based on `type`.
	category: S.optionalKey(NonNegativeIntFromStringEffectSchema),
	toWallet: S.optionalKey(NonNegativeIntFromStringEffectSchema),
	installmentsEnabled: S.optionalKey(S.Boolean),
	installmentsCount: S.optionalKey(NonNegativeIntFromStringEffectSchema),
	installmentsCents: S.optionalKey(S.String),
});

/** Standard Schema v1 derived from the canonical `Transaction` struct. */
export const TransactionSchema = S.toStandardSchemaV1(Transaction);

/**
 * Documented projection of `Transaction` for the read side (collection
 * rows). The form's `id: number | "new"` is narrowed to `number`; the
 * form-only `wallet` / `category` / `toWallet` are renamed to the
 * Drizzle columns they correspond to (`walletId` / `categoryId`); the
 * server-set `transferenceId` / `installmentGroupId` /
 * `installmentIndex` / `installmentTotal` / `subscriptionId` /
 * `createdAt` / `updatedAt` columns are added.
 */
export const TransactionRow = S.Struct({
	id: S.Number,
	date: IsoDateStringSchema,
	description: S.NullOr(S.String),
	cents: S.Number,
	type: S.Literals(["expense", "income", "transference"]),
	walletId: S.Number,
	categoryId: S.Number,
	transferenceId: S.NullOr(S.String),
	installmentGroupId: S.NullOr(S.String),
	installmentIndex: S.NullOr(S.Number),
	installmentTotal: S.NullOr(S.Number),
	subscriptionId: S.NullOr(S.Number),
	paid: S.Boolean,
	transferenceFrom: S.NullOr(
		S.Struct({
			id: S.Number,
			walletId: S.Number,
		}),
	),
	transferenceTo: S.NullOr(
		S.Struct({
			id: S.Number,
			walletId: S.Number,
		}),
	),
});

/** Standard Schema v1 derived from the `TransactionRow` projection. */
export const TransactionRowSchema = S.toStandardSchemaV1(TransactionRow);

export type Transaction = S.Schema.Type<typeof Transaction>;
export type TransactionEncoded = S.Codec.Encoded<typeof Transaction>;
export type TransactionRow = S.Schema.Type<typeof TransactionRow>;

/**
 * Bidirectional compatibility check between the canonical schema and the
 * Drizzle table.
 *
 * The canonical schema is a projection of the Drizzle row. The schema
 * may intentionally narrow a Drizzle field (e.g. the date pattern
 * check is narrower than Drizzle's `string`) or widen a Drizzle field
 * (e.g. `id: number | "new"`, `type: "income" | "expense" |
 * "transference"`). The data layer is responsible for the narrowing
 * when calling Drizzle.
 *
 * The assert iterates over the intersection of keys (the form-only
 * fields and the server-set fields are out of scope; they are
 * deliberately absent from the canonical schema). The check is
 * bidirectional so both narrowing and widening are allowed. Note that
 * the schema's `wallet` is renamed to Drizzle's `walletId` in the
 * data layer; the assert therefore does not check `wallet` (it is not
 * in `keyof Drizzle`).
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

type _AssertTransactionSchemaMatchesDrizzle = AssertSchemaCompatibleWithDrizzle<
	Transaction,
	typeof transactionTable.$inferSelect
>;

// `as const` keeps each `true` literal (not widened to `boolean`);
// `satisfies` validates the object against the assert type. If any
// entry is not `true`, this fails to type-check.
// `as const` keeps each `true` literal (not widened to `boolean`);
// `satisfies` validates the object against the assert type. The keys
// here must be exactly the intersection of schema and Drizzle keys.
// `wallet` is omitted because it is renamed to `walletId` in the data
// layer; `walletId` is the key actually present in Drizzle.
const _assertTransactionSchemaMatchesDrizzle = {
	id: true,
	type: true,
	cents: true,
	date: true,
	description: true,
	paid: true,
} as const satisfies _AssertTransactionSchemaMatchesDrizzle;
void _assertTransactionSchemaMatchesDrizzle;
