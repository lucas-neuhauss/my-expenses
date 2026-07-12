/**
 * Canonical schema for the `category` entity.
 *
 * Follows the same pattern as `wallet.ts` (task 1.1 spike):
 * one Effect `S.Struct` definition is the single source of truth; the
 * derived Standard Schema v1 is consumed by SvelteKit's `form()` and
 * TanStack DB's `queryCollectionOptions`.
 *
 * Two projections are exported:
 *
 * - `Category`     — the upsert shape (what the form sends and the data
 *                    layer consumes). Includes `id: number | "new"` and
 *                    an optional `subcategories` array.
 * - `CategoryRow`  — the read shape (what the collection row carries).
 *                    Adds server-set `parentId` and `unique`; omits the
 *                    form-only `subcategories` and narrows `id` to a
 *                    plain `number` since a row always has one.
 *
 * The shared `CategoryBaseFields` (name, type, icon) is the single
 * source of truth for those fields; both projections extend it.
 */
import { CATEGORY_ICON_LIST } from "$lib/categories";
import { NonNegativeIntFromStringEffectSchema } from "$lib/schema";
import { category as categoryTable } from "$lib/server/db/schema";
import { Schema as S } from "effect";

/**
 * Each category icon is one of the curated icon names. `S.Literals` is
 * the Effect equivalent of Zod's `z.enum(arr)` — a union of literal
 * string values.
 */
const CategoryIconSchema = S.Literals(CATEGORY_ICON_LIST);

/**
 * `id` is a number for existing categories and the literal `"new"` for
 * a category the form is creating. The form submits it as a string, so
 * the encoded side is `string | number`; the decoded side is
 * `number | "new"`. The data layer switches on `id === "new"` to decide
 * between insert and update paths.
 */
const CategoryIdSchema = S.Union([
	S.Literal("new"),
	NonNegativeIntFromStringEffectSchema,
]);

/**
 * One row in the `subcategories` array. The form submits several
 * `subcategories[i].{id,name,icon}` fields; SvelteKit's form helper
 * groups them into an array of these objects.
 */
const SubcategorySchema = S.Struct({
	id: CategoryIdSchema,
	name: S.String.check(S.isLengthBetween(1, 255)),
	icon: CategoryIconSchema,
});

/**
 * Fields shared by both the upsert and the row projections. Defined
 * once so neither projection hand-copies the other.
 */
const CategoryNameSchema = S.String.check(S.isLengthBetween(1, 255));
const CategoryTypeSchema = S.Literals(["income", "expense"]);

/**
 * Canonical Effect Struct for the category entity (upsert shape).
 *
 * The encoded form (form-data) is the same shape the form sends:
 * `subcategories` is optional and defaults to `[]` if the form has no
 * subcategory rows. The decoded type is always a complete shape with
 * `subcategories: Subcategory[]`.
 */
export const Category = S.Struct({
	id: CategoryIdSchema,
	name: CategoryNameSchema,
	type: CategoryTypeSchema,
	icon: CategoryIconSchema,
	subcategories: S.optionalKey(S.Array(SubcategorySchema)).pipe(
		S.withDecodingDefault((): S.Schema.Type<typeof SubcategorySchema>[] => []),
	),
});

/**
 * Documented projection of `Category` for the read side (collection
 * rows). The form-side `id: number | "new"` is narrowed to `number`; the
 * form-only `subcategories` is omitted; the server-set `parentId` and
 * `unique` columns are added. Shared `name` / `type` / `icon` are
 * reused from the canonical so they are not hand-copied.
 */
export const CategoryRow = S.Struct({
	id: S.Number,
	name: CategoryNameSchema,
	type: CategoryTypeSchema,
	icon: CategoryIconSchema,
	parentId: S.NullOr(S.Number),
	unique: S.NullOr(S.Literals(["transference_in", "transference_out"])),
});

/**
 * Standard Schema v1 derived from the canonical `Category` struct.
 *
 * Consumed by:
 *   - `form()` from `@sveltejs/kit`
 *   - the upsert-category dialog
 */
export const CategorySchema = S.toStandardSchemaV1(Category);

/**
 * Standard Schema v1 derived from the `CategoryRow` projection.
 *
 * Consumed by `queryCollectionOptions` from `@tanstack/query-db-collection`
 * for the category collection.
 */
export const CategoryRowSchema = S.toStandardSchemaV1(CategoryRow);

export type Category = S.Schema.Type<typeof Category>;
export type CategoryEncoded = S.Codec.Encoded<typeof Category>;
export type CategoryRow = S.Schema.Type<typeof CategoryRow>;
export type Subcategory = S.Schema.Type<typeof SubcategorySchema>;

/**
 * Bidirectional compatibility check between the canonical schema and the
 * Drizzle table.
 *
 * The canonical schema is a projection of the Drizzle row. The schema
 * may intentionally narrow a Drizzle field (e.g. the icon literal union
 * is narrower than Drizzle's `string`) or widen a Drizzle field (e.g.
 * `id: number | "new"` is wider than Drizzle's `number`). The data
 * layer is responsible for the narrowing when calling Drizzle.
 *
 * The assert iterates over the intersection of keys (form-only fields
 * and server-set fields are out of scope; they are deliberately absent
 * from the canonical schema). The check is bidirectional so both
 * narrowing and widening are allowed.
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

type _AssertCategorySchemaMatchesDrizzle = AssertSchemaCompatibleWithDrizzle<
	Category,
	typeof categoryTable.$inferSelect
>;

// `as const` keeps each `true` literal (not widened to `boolean`);
// `satisfies` validates the object against the assert type. The keys
// here must be exactly the intersection of schema and Drizzle keys.
const _assertCategorySchemaMatchesDrizzle = {
	id: true,
	name: true,
	type: true,
	icon: true,
} as const satisfies _AssertCategorySchemaMatchesDrizzle;
void _assertCategorySchemaMatchesDrizzle;
