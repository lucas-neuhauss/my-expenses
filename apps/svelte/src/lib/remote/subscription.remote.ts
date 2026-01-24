import { command, form, getRequestEvent } from "$app/server";
import { UpsertSubscriptionSchema } from "$lib/components/upsert-subscription/upsert-subscription-schema";
import {
	deleteSubscriptionData,
	generatePendingTransactionsData,
	togglePauseSubscriptionData,
	upsertSubscriptionData,
} from "$lib/server/data/subscription";
import { NodeSdkLive } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";
import z from "zod";

export const upsertSubscriptionAction = form(UpsertSubscriptionSchema, async (data) => {
	const program = Effect.fn("[remote] - upsert-subscription")(function* () {
		const { locals } = getRequestEvent();
		const user = locals.user;
		if (!user) {
			return yield* Effect.fail(error(401));
		}
		const result = yield* upsertSubscriptionData({ userId: user.id, data });
		// Re-generate pending transactions after any subscription change
		if (result.ok) {
			yield* generatePendingTransactionsData({ userId: user.id });
		}
		return result;
	});

	return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
});

export const deleteSubscriptionAction = command(
	z.number().int().positive(),
	async (subscriptionId) => {
		const program = Effect.fn("[remote] - delete-subscription")(function* () {
			const { locals } = getRequestEvent();
			const user = locals.user;
			if (!user) {
				return yield* Effect.fail(error(401));
			}
			return yield* deleteSubscriptionData({ userId: user.id, subscriptionId });
		});

		return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
	},
);

export const togglePauseSubscriptionAction = command(
	z.number().int().positive(),
	async (subscriptionId) => {
		const program = Effect.fn("[remote] - toggle-pause-subscription")(function* () {
			const { locals } = getRequestEvent();
			const user = locals.user;
			if (!user) {
				return yield* Effect.fail(error(401));
			}
			const result = yield* togglePauseSubscriptionData({
				userId: user.id,
				subscriptionId,
			});
			// Re-generate pending transactions after unpausing
			if (result.ok && result.message === "Subscription resumed") {
				yield* generatePendingTransactionsData({ userId: user.id });
			}
			return result;
		});

		return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
	},
);

export const generateSubscriptionTransactionsAction = command(z.void(), async () => {
	const program = Effect.fn("[remote] - generate-subscription-transactions")(
		function* () {
			const { locals } = getRequestEvent();
			const user = locals.user;
			if (!user) {
				return yield* Effect.fail(error(401));
			}
			return yield* generatePendingTransactionsData({ userId: user.id });
		},
	);

	return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
});
