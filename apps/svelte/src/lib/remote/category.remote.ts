import { command, form, query } from "$app/server";
import { Category, CategorySchema } from "$lib/schemas/category";
import {
	deleteCategoryData,
	getCategoriesData,
	upsertCategoryData,
} from "$lib/server/data/category";
import { authenticated, requireId, type SessionUser } from "$lib/server/remote";
import { error } from "@sveltejs/kit";

export const getCategories = query(authenticated((user) => getCategoriesData(user.id)));

/**
 * The category form uses the "unchecked" form mode with manual
 * validation via `CategorySchema`. Two reasons:
 *
 *  1. SvelteKit's `form()` generic inference fails for `S.Struct`s
 *     that contain an `S.Array` (the `subcategories` field) — the
 *     `HasNonOptionalBoolean<InferInput<Schema>>` conditional in the
 *     helper's signature gets stuck evaluating the deeply-nested
 *     `readonly [{...}][]` type and the form helper falls back to the
 *     "unchecked" overload.
 *  2. The category dialog uses plain HTML inputs with `name`
 *     attributes; it does not use the form's `fields.X.as(...)` field
 *     proxy. The schema-aware overload buys us nothing here.
 *
 * The handler validates the raw form input with the canonical schema
 * and re-throws a 400 `ValidationError` on failure, so the client
 * still sees structured, tag-dispatched errors.
 */
export const upsertCategoryAction = form(
	"unchecked",
	authenticated((user: SessionUser, raw: unknown) => {
		const validation = CategorySchema["~standard"].validate(raw) as
			| { value: unknown; issues?: undefined }
			| {
					issues: ReadonlyArray<{
						message: string;
						path?: ReadonlyArray<PropertyKey>;
					}>;
			  };
		if (!("value" in validation)) {
			throw error(400, {
				_tag: "ValidationError",
				issues: validation.issues,
			});
		}
		return upsertCategoryData({ userId: user.id, data: validation.value as Category });
	}),
);

export const deleteCategoryAction = command(
	"unchecked",
	authenticated((user: SessionUser, input: unknown) =>
		deleteCategoryData({ userId: user.id, categoryId: requireId(input, "category") }),
	),
);
