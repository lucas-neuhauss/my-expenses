import {
	deleteCategoryData,
	getNestedCategoriesData,
	upsertCategoryData,
} from "$lib/server/data/category";
import { NodeSdkLive } from "$lib/server/observability";
import type { UserId } from "$lib/types.js";
import { error, redirect } from "@sveltejs/kit";
import { Effect, Either, Schema as S } from "effect";
import { z } from "zod/v4";

const program = Effect.fn("[load] - /categories")(function* ({
	userId,
	searchParamType,
}: {
	userId: UserId;
	searchParamType: string | null;
}) {
	const type = yield* S.decodeUnknown(
		S.Literal("expense", "income").pipe(
			S.annotations({ decodingFallback: () => Either.right("expense") }),
		),
	)(searchParamType);
	const nestedCategories = yield* getNestedCategoriesData(userId, type);
	return { type, nestedCategories };
});

export const load = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return redirect(302, "/login");
	}

	return await Effect.runPromise(
		program({
			userId: user.id,
			searchParamType: event.url.searchParams.get("type"),
		}).pipe(Effect.provide(NodeSdkLive), Effect.tapErrorCause(Effect.logError)),
	);
};

export const actions = {
	"upsert-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const formData = await event.request.formData();
		const program = Effect.fn("[action] - upsert-category")(function* ({
			userId,
		}: {
			userId: UserId;
		}) {
			yield* upsertCategoryData({ userId, formData });
		});

		return await Effect.runPromise(
			program({ userId: user.id }).pipe(Effect.provide(NodeSdkLive)),
		);
	},
	"delete-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const searchParams = event.url.searchParams;

		const program = Effect.fn("[action] - delete-category")(function* ({
			userId,
			searchParamsId,
		}: {
			userId: UserId;
			searchParamsId: string | null;
		}) {
			const categoryId = z.coerce.number().int().min(1).parse(searchParamsId);
			return yield* deleteCategoryData({ userId, categoryId });
		});

		return await Effect.runPromise(
			program({ userId: user.id, searchParamsId: searchParams.get("id") }).pipe(
				Effect.provide(NodeSdkLive),
			),
		);
	},
};
