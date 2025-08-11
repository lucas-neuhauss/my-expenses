import {
	deleteCategory,
	getNestedCategories,
	upsertCategory,
} from "$lib/server/data/category";
import { error, redirect } from "@sveltejs/kit";
import { Effect, Either, Schema as S } from "effect";
import { z } from "zod/v4";

export const load = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return redirect(302, "/login");
	}

	const program = Effect.fn("[load] - /categories")(function* ({
		searchParamType,
	}: {
		searchParamType: string | null;
	}) {
		const type = yield* S.decodeUnknown(
			S.Literal("expense", "income").pipe(
				S.annotations({ decodingFallback: () => Either.right("expense") }),
			),
		)(searchParamType);
		const nestedCategories = yield* getNestedCategories(user.id, type);
		return { type, nestedCategories };
	});

	return await Effect.runPromise(
		program({ searchParamType: event.url.searchParams.get("type") }),
	);
};

export const actions = {
	"upsert-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const formData = await event.request.formData();
		return upsertCategory({ userId: user.id, formData });
	},
	"delete-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const searchParams = event.url.searchParams;
		const categoryId = z.coerce.number().int().min(1).parse(searchParams.get("id"));
		return deleteCategory({
			userId: user.id,
			categoryId,
		});
	},
};
