import {
	deleteCategory,
	getNestedCategories,
	upsertCategory,
} from "$lib/server/data/category";
import type { UserId } from "$lib/types.js";
import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
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
	const nestedCategories = yield* getNestedCategories(userId, type);
	return { type, nestedCategories };
});

export const load = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return redirect(302, "/login");
	}

	const NodeSdkLive = NodeSdk.layer(() => ({
		resource: { serviceName: "test" },
		spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
	}));

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
