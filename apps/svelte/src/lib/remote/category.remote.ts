import { command, form, getRequestEvent } from "$app/server";
import { UpsertCategorySchema } from "$lib/components/upsert-category/upsert-category-schema";
import { deleteCategoryData, upsertCategoryData } from "$lib/server/data/category";
import { withTelemetry } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

export const upsertCategoryAction = form(UpsertCategorySchema, async (data) => {
	const program = Effect.fn("[remote] - upsert-category")(function* () {
		const { locals } = getRequestEvent();
		const user = locals.user;
		if (!user) {
			return yield* Effect.fail(error(401));
		}
		return yield* upsertCategoryData({ userId: user!.id, data: data });
	});

	return await Effect.runPromise(withTelemetry(program()));
});

export const deleteCategoryAction = command("unchecked", async (categoryId: unknown) => {
	const numId =
		typeof categoryId === "number"
			? categoryId
			: typeof categoryId === "string"
				? parseInt(categoryId, 10)
				: NaN;
	if (isNaN(numId) || numId <= 0) {
		return { ok: false, message: "Invalid category ID" };
	}
	const program = Effect.fn("[remote] - delete-category")(function* () {
		const { locals } = getRequestEvent();
		const user = locals.user;
		if (!user) {
			return yield* Effect.fail(error(401));
		}
		return yield* deleteCategoryData({ userId: user.id, categoryId: numId });
	});

	return await Effect.runPromise(withTelemetry(program()));
});
