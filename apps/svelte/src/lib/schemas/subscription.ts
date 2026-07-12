/**
 * Canonical schema for the `subscription` entity.
 *
 * Follows the same pattern as `wallet.ts` (task 1.1 spike) and
 * `category.ts`: one Effect `S.Struct` definition is the single source
 * of truth; the derived Standard Schema v1 is consumed by SvelteKit's
 * `form()` and TanStack DB's `queryCollectionOptions`.
 *
 * The canonical schema is the upsert (form input) shape. The
 * `SubscriptionRow` projection adds the joined `category` / `wallet`
 * objects and the server-set `paused` / `lastGenerated` fields for the
 * read side.
 */
import { NonNegativeIntFromStringEffectSchema } from "$lib/schema";
import { subscription as subscriptionTable } from "$lib/server/db/schema";
import { Schema as S, SchemaTransformation } from "effect";

/**
 * `id` is a number for existing subscriptions and the literal `"new"`
 * for a subscription the form is creating. Same pattern as the
 * category upsert shape.
 */
const SubscriptionIdSchema = S.Union([
	S.Literal("new"),
	NonNegativeIntFromStringEffectSchema,
]);

/**
 * The form sends the recurring amount as a dollar string ("10.50");
 * the canonical Type is the integer cents value. The encoding direction
 * is symmetrical (cents -> dollar string).
 */
const CentsFromDollarStringSchema = S.String.pipe(
	S.decodeTo(
		S.Number.pipe(S.check(S.isInt())),
		SchemaTransformation.transform({
			decode: (str: string) => Math.round(Number(str) * 100),
			encode: (cents: number) => String(cents / 100),
		}),
	),
);

/**
 * `categoryId` / `walletId` are positive integers in the form's input
 * (the form sends a string, which decodes to a positive int).
 */
const PositiveIntFromStringSchema = NonNegativeIntFromStringEffectSchema.pipe(
	S.check(S.isGreaterThan(0)),
);

const DayOfMonthSchema = NonNegativeIntFromStringEffectSchema.pipe(
	S.check(S.isGreaterThanOrEqualTo(1)),
	S.check(S.isLessThanOrEqualTo(31)),
);

/**
 * ISO date string (`YYYY-MM-DD`). The form sends an empty string for
 * `endDate` when no end date is set; this transforms to `null` for the
 * data layer.
 */
const DateStringSchema = S.String.check(S.isPattern(/^\d{4}-\d{2}-\d{2}$/));
const OptionalDateStringSchema = S.String.pipe(
	S.decodeTo(
		S.NullOr(DateStringSchema),
		SchemaTransformation.transform({
			decode: (s: string) => (s === "" ? null : s),
			encode: (d: string | null) => d ?? "",
		}),
	),
);

/**
 * Shared fields between the upsert shape and the read-side row.
 */
const SubscriptionBaseFields = {
	name: S.String.check(S.isLengthBetween(1, 255)),
} as const;

/**
 * Canonical Effect Struct for the subscription entity (upsert shape).
 */
export const Subscription = S.Struct({
	id: SubscriptionIdSchema,
	...SubscriptionBaseFields,
	cents: CentsFromDollarStringSchema,
	categoryId: PositiveIntFromStringSchema,
	walletId: PositiveIntFromStringSchema,
	dayOfMonth: DayOfMonthSchema,
	startDate: DateStringSchema,
	endDate: OptionalDateStringSchema,
});

/**
 * Documented projection of `Subscription` for the read side (collection
 * rows). Adds the joined `category` / `wallet` objects and the
 * server-set `paused` / `lastGenerated` columns.
 */
export const SubscriptionRow = S.Struct({
	id: S.Number,
	...SubscriptionBaseFields,
	cents: S.Number,
	userId: S.String,
	categoryId: S.Number,
	walletId: S.Number,
	dayOfMonth: S.Number,
	startDate: S.String,
	endDate: S.NullOr(S.String),
	paused: S.Boolean,
	lastGenerated: S.NullOr(S.String),
	category: S.Struct({
		id: S.Number,
		name: S.String,
		icon: S.String,
	}),
	wallet: S.Struct({
		id: S.Number,
		name: S.String,
	}),
});

/**
 * Standard Schema v1 derived from the canonical `Subscription` struct.
 * Consumed by `form()` from `@sveltejs/kit`.
 */
export const SubscriptionSchema = S.toStandardSchemaV1(Subscription);

/**
 * Standard Schema v1 derived from the `SubscriptionRow` projection.
 * Consumed by `queryCollectionOptions` for the subscription collection.
 */
export const SubscriptionRowSchema = S.toStandardSchemaV1(SubscriptionRow);

export type Subscription = S.Schema.Type<typeof Subscription>;
export type SubscriptionEncoded = S.Codec.Encoded<typeof Subscription>;
export type SubscriptionRow = S.Schema.Type<typeof SubscriptionRow>;

/**
 * Bidirectional compatibility check between the canonical schema and the
 * Drizzle table.
 *
 * The canonical schema is a projection of the Drizzle row. The schema
 * may intentionally narrow a Drizzle field (e.g. the `dayOfMonth`
 * 1–31 constraint is narrower than Drizzle's `integer`) or widen a
 * Drizzle field (e.g. `id: number | "new"`). The data layer is
 * responsible for the narrowing when calling Drizzle.
 *
 * The assert iterates over the intersection of keys (the form-only
 * fields and the server-set fields are out of scope; they are
 * deliberately absent from the canonical schema). The check is
 * bidirectional so both narrowing and widening are allowed.
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

type _AssertSubscriptionSchemaMatchesDrizzle = AssertSchemaCompatibleWithDrizzle<
	Subscription,
	typeof subscriptionTable.$inferSelect
>;

// `as const` keeps each `true` literal (not widened to `boolean`);
// `satisfies` validates the object against the assert type. The keys
// here must be exactly the intersection of schema and Drizzle keys.
const _assertSubscriptionSchemaMatchesDrizzle = {
	id: true,
	name: true,
	cents: true,
	categoryId: true,
	walletId: true,
	dayOfMonth: true,
	startDate: true,
	endDate: true,
} as const satisfies _AssertSubscriptionSchemaMatchesDrizzle;
void _assertSubscriptionSchemaMatchesDrizzle;
