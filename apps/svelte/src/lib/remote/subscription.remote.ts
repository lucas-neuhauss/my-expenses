import { command, form, getRequestEvent } from "$app/server";
import { SubscriptionSchema } from "$lib/schemas/subscription";
import {
	deleteSubscriptionData,
	generatePendingTransactionsData,
	togglePauseSubscriptionData,
	upsertSubscriptionData,
} from "$lib/server/data/subscription";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

export const upsertSubscriptionAction = form(SubscriptionSchema, async (data) => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	const program = Effect.gen(function* () {
		const message = yield* upsertSubscriptionData({ userId: user.id, data });
		// Re-generate pending transactions after any subscription change.
		yield* generatePendingTransactionsData({ userId: user.id });
		return message;
	}).pipe(Effect.tapError(Effect.logError));

	return runOrThrow(program, {
		SubscriptionNotFoundError: (e) => e,
	});
});

export const deleteSubscriptionAction = command("unchecked", async (id: unknown) => {
	const numId =
		typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
	if (isNaN(numId) || numId <= 0) {
		throw error(400, {
			_tag: "InvalidInputError",
			message: "Invalid subscription ID",
		});
	}

	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	const program = deleteSubscriptionData({ userId: user.id, subscriptionId: numId }).pipe(
		Effect.tapError(Effect.logError),
	);

	return runOrThrow(program, {
		SubscriptionNotFoundError: (e) => e,
	});
});

export const togglePauseSubscriptionAction = command("unchecked", async (id: unknown) => {
	const numId =
		typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
	if (isNaN(numId) || numId <= 0) {
		throw error(400, {
			_tag: "InvalidInputError",
			message: "Invalid subscription ID",
		});
	}

	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	const program = Effect.gen(function* () {
		const message = yield* togglePauseSubscriptionData({
			userId: user.id,
			subscriptionId: numId,
		});
		// Re-generate pending transactions after unpausing.
		if (message === "Subscription resumed") {
			yield* generatePendingTransactionsData({ userId: user.id });
		}
		return message;
	}).pipe(Effect.tapError(Effect.logError));

	return runOrThrow(program, {
		SubscriptionNotFoundError: (e) => e,
	});
});

export const generateSubscriptionTransactionsAction = command("unchecked", async () => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	const program = generatePendingTransactionsData({ userId: user.id }).pipe(
		Effect.tapError(Effect.logError),
	);

	return runOrThrow(program, {});
});
