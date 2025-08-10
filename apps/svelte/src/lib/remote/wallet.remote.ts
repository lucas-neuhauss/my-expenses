import { command, form, getRequestEvent } from "$app/server";
import { UpsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema";
import { deleteWalletData, upsertWalletData } from "$lib/server/data/wallet";
import { Db } from "$lib/server/db";
import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { error } from "@sveltejs/kit";
import { Effect, ParseResult, Schema as S } from "effect";

export const upsertWalletAction = form(async (data) => {
	const program = Effect.fn("upsertWalletAction")(
		function* () {
			const { locals } = getRequestEvent();
			const user = locals.user;
			if (!user) {
				return error(401);
			}

			yield* Effect.logDebug({
				id: data.get("id"),
				name: data.get("name"),
				initialBalance: data.get("initialBalance"),
			});
			const parsedData = yield* S.decodeUnknown(UpsertWalletSchema)(
				{
					id: data.get("id"),
					name: data.get("name"),
					initialBalance: data.get("initialBalance"),
				},
				{ errors: "all" },
			);

			const message = yield* upsertWalletData({ userId: user.id, data: parsedData });
			return { success: true as const, message };
		},
		Effect.tapError((e) => Effect.logError(e)),
		Effect.catchTags({
			ParseError: (error) => {
				const formattedErrors = ParseResult.ArrayFormatter.formatErrorSync(error);
				const formErrors: Record<string, string> = {};
				formattedErrors.forEach((err) => {
					if (err.path && err.path.length > 0) {
						formErrors[err.path[0] as string] = err.message; // Assuming single-level paths for simplicity
					}
				});
				return Effect.succeed({
					success: false,
					errorType: "ParseError",
					formErrors,
				} as const);
			},
			SqlError: () =>
				Effect.succeed({
					success: false,
					errorType: "SqlError",
				} as const),
			EntityNotFoundError: (error) =>
				Effect.succeed({
					success: false,
					errorType: "EntityNotFoundError",
					message: `${error.entity} not found`,
				} as const),
		}),
		Effect.provide(Db.Client),
	);

	const NodeSdkLive = NodeSdk.layer(() => ({
		resource: { serviceName: "upsertWallet" },
		spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
	}));

	return Effect.runPromise(
		program().pipe(Effect.provide(NodeSdkLive), Effect.catchAllCause(Effect.logError)),
	);
});

export const deleteWalletAction = command(
	S.standardSchemaV1(S.Int.pipe(S.positive())),
	async (id) => {
		const program = Effect.fn("deleteWalletAction")(
			function* () {
				const {
					locals: { user },
				} = getRequestEvent();
				if (!user) {
					return error(401);
				}

				const message = yield* deleteWalletData({ userId: user.id, id });
				return { success: true, message };
			},
			Effect.catchTag("DeleteWalletError", (error) =>
				Effect.succeed({
					success: false,
					errorType: "DeleteWalletError",
					message: error.message,
				}),
			),
			Effect.provide(Db.Client),
		);

		const NodeSdkLive = NodeSdk.layer(() => ({
			resource: { serviceName: "deleteWalletAction" },
			spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
		}));

		return Effect.runPromise(
			program().pipe(Effect.provide(NodeSdkLive), Effect.catchAllCause(Effect.logError)),
		);
	},
);
