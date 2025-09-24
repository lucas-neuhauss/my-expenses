import { command, form, getRequestEvent } from "$app/server";
import { UpsertCategorySchema } from "$lib/components/upsert-category/upsert-category-schema";
import { deleteCategoryData, upsertCategoryData } from "$lib/server/data/category";
import { NodeSdkLive } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";
import z from "zod";

export const upsertCategoryAction = form(UpsertCategorySchema, async (data) => {
	const program = Effect.fn("[remote] - upsert-category")(function* () {
		const { locals } = getRequestEvent();
		const user = locals.user;
		if (!user) {
			return yield* Effect.fail(error(401));
		}
		return yield* upsertCategoryData({ userId: user!.id, data: data });
	});

	return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
});

export const deleteCategoryAction = command(
	z.number().int().positive(),
	async (categoryId) => {
		const program = Effect.fn("[remote] - delete-category")(function* () {
			const { locals } = getRequestEvent();
			const user = locals.user;
			if (!user) {
				return yield* Effect.fail(error(401));
			}
			return yield* deleteCategoryData({ userId: user.id, categoryId });
		});

		return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
	},
);
