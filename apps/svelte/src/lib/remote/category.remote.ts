import { command, form, getRequestEvent } from "$app/server";
import { Category, CategorySchema } from "$lib/schemas/category";
import { deleteCategoryData, upsertCategoryData } from "$lib/server/data/category";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

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
export const upsertCategoryAction = form("unchecked", async (raw: unknown) => {
	const validation = CategorySchema["~standard"].validate(raw);
	// The schema is synchronous (no async transforms or checks), so at
	// runtime the result is never a Promise. Narrow with the success
	// shape to access `issues` on the failure branch.
	const sync = validation as
		| { value: unknown; issues?: undefined }
		| { issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey> }> };
	if (!("value" in sync)) {
		throw error(400, {
			_tag: "ValidationError",
			issues: sync.issues,
		});
	}
	const data: Category = sync.value as Category;

	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	return runOrThrow(
		upsertCategoryData({ userId: user.id, data }).pipe(
			Effect.tapError((e) => Effect.logError(e)),
		),
		{
			ForbiddenError: (e) => e,
			DeleteCategoryError: (e) => e,
		},
	);
});

export const deleteCategoryAction = command("unchecked", async (id: unknown) => {
	const numId =
		typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
	if (isNaN(numId) || numId <= 0) {
		throw error(400, {
			_tag: "InvalidInputError",
			message: "Invalid category ID",
		});
	}

	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	return runOrThrow(
		deleteCategoryData({ userId: user.id, categoryId: numId }).pipe(
			Effect.tapError((e) => Effect.logError(e)),
		),
		{
			EntityNotFoundError: (e) => e,
			DeleteCategoryError: (e) => e,
		},
	);
});
