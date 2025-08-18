import { getNestedCategoriesData } from "$lib/server/data/category";
import { NodeSdkLive } from "$lib/server/observability";
import type { UserId } from "$lib/types.js";
import { redirect } from "@sveltejs/kit";
import { Effect, Either, Schema as S } from "effect";

const program = Effect.fn("[load] - /categories")(function* ({
	userId,
	searchParamType,
}: {
	userId: UserId;
	searchParamType: string | null;
}) {
	const type = yield* S.decodeUnknown(
		S.Literal("expense", "income").pipe(
			S.annotations({ decodingFallback: () => Either.right("expense" as const) }),
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
