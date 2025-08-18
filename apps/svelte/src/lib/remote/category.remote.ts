import { command, form, getRequestEvent } from "$app/server";
import { deleteCategoryData, upsertCategoryData } from "$lib/server/data/category";
import { NodeSdkLive } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";
import z from "zod";

export const upsertCategoryAction = form(async (formData) => {
	const program = Effect.fn("[remote] - upsert-category")(function* () {
		const { locals } = getRequestEvent();
		const user = locals.user;
		if (!user) {
			return yield* Effect.fail(error(401));
		}
		return yield* upsertCategoryData({ userId: user!.id, formData });
	});

	return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
});

export const deleteCategoryAction = command(
	z.number().int().positive(),
	async (categoryId) => {
		const program = Effect.fn("[action] - delete-category")(function* () {
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
