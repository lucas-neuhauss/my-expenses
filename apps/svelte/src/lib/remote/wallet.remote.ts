import { command, form, getRequestEvent } from "$app/server";
import { UpsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema";
import { deleteWalletData, upsertWalletData } from "$lib/server/data/wallet";
import { NodeSdkLive } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Effect, Schema as S } from "effect";

export const upsertWalletAction = form(UpsertWalletSchema, async (data) => {
	const program = Effect.fn("[remote] - upsert-wallet")(
		function* () {
			const { locals } = getRequestEvent();
			const user = locals.user;
			if (!user) {
				return error(401);
			}

			const message = yield* upsertWalletData({ userId: user.id, data });
			return { success: true as const, message };
		},
		Effect.tapError((e) => Effect.logError(e)),
		Effect.catchTags({
			DbError: () =>
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
	);

	return Effect.runPromise(
		program().pipe(Effect.provide(NodeSdkLive), Effect.catchAllCause(Effect.logError)),
	);
});

export const deleteWalletAction = command(
	S.standardSchemaV1(S.Int.pipe(S.positive())),
	async (id) => {
		const program = Effect.fn("[remote] - delete-wallet")(
			function* () {
				const {
					locals: { user },
				} = getRequestEvent();
				if (!user) {
					return error(401);
				}

				const message = yield* deleteWalletData({ userId: user.id, id });
				return { ok: true, message };
			},
			Effect.catchTag("DeleteWalletError", (error) =>
				Effect.succeed({
					ok: false,
					errorType: "DeleteWalletError",
					message: error.message,
				}),
			),
		);

		return Effect.runPromise(
			program().pipe(Effect.provide(NodeSdkLive), Effect.catchAllCause(Effect.logError)),
		);
	},
);
