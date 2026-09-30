import { command, form, query } from "$app/server";
import { Subscription, SubscriptionSchema } from "$lib/schemas/subscription";
import {
	deleteSubscriptionData,
	generatePendingTransactionsData,
	getSubscriptionsData,
	togglePauseSubscriptionData,
	upsertSubscriptionData,
} from "$lib/server/data/subscription";
import { authenticated, requireId, type SessionUser } from "$lib/server/remote";
import { Effect } from "effect";

export const getSubscriptions = query(
	authenticated((user) => getSubscriptionsData({ userId: user.id })),
);

/**
 * One handler, two transports. The dialog uses the `form` adapter and
 * the collection uses the `command` adapter, but the decoded input, the
 * upsert, and the pending-transaction re-generation are the same code
 * behind both.
 */
const upsertSubscription = authenticated((user: SessionUser, data: Subscription) =>
	Effect.gen(function* () {
		const message = yield* upsertSubscriptionData({ userId: user.id, data });
		// Re-generate pending transactions after any subscription change.
		yield* generatePendingTransactionsData({ userId: user.id });
		return message;
	}),
);

export const upsertSubscriptionCommand = command(SubscriptionSchema, upsertSubscription);

export const upsertSubscriptionAction = form(SubscriptionSchema, upsertSubscription);

export const deleteSubscriptionAction = command(
	"unchecked",
	authenticated((user: SessionUser, input: unknown) =>
		deleteSubscriptionData({
			userId: user.id,
			subscriptionId: requireId(input, "subscription"),
		}),
	),
);

export const togglePauseSubscriptionAction = command(
	"unchecked",
	authenticated((user: SessionUser, input: unknown) =>
		Effect.gen(function* () {
			const message = yield* togglePauseSubscriptionData({
				userId: user.id,
				subscriptionId: requireId(input, "subscription"),
			});
			// Re-generate pending transactions after unpausing.
			if (message === "Subscription resumed") {
				yield* generatePendingTransactionsData({ userId: user.id });
			}
			return message;
		}),
	),
);

export const generateSubscriptionTransactionsAction = command(
	"unchecked",
	authenticated((user: SessionUser) =>
		generatePendingTransactionsData({ userId: user.id }),
	),
);
