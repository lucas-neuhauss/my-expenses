import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { deleteSubscriptionAction } from "$lib/remote/subscription.remote";
import { SubscriptionRowSchema, type SubscriptionRow } from "$lib/schemas/subscription";
import { getApiUrl } from "$lib/utils/fetch";
import { isHttpError } from "@sveltejs/kit";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/svelte-db";
import { toast } from "svelte-sonner";

/** Re-exported for callers that need the row shape (e.g. dialogs). */
export type SubscriptionWithRelations = SubscriptionRow;

/**
 * Surface a subscription-error toast by dispatching on the tagged
 * error's `_tag`. Any tag not in the table is treated as a generic
 * failure; the collection caller re-throws to roll back the optimistic
 * write.
 */
function subscriptionErrorToast(e: unknown): void {
	if (!isHttpError(e)) {
		toast.error("Something went wrong. Please try again later.");
		return;
	}
	const body = e.body as { _tag?: string; message?: string } | undefined;
	switch (body?._tag) {
		case "SubscriptionNotFoundError":
			toast.error("Subscription not found");
			return;
		case "InvalidInputError":
			toast.error(body.message ?? "Invalid input");
			return;
		default:
			toast.error("Something went wrong. Please try again later.");
	}
}

export const subscriptionCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		// `SubscriptionRowSchema` is the documented read-side projection
		// of the canonical `Subscription` schema; see
		// `src/lib/schemas/subscription.ts`.
		schema: SubscriptionRowSchema,
		queryKey: ["subscription"],
		queryFn: async () => {
			const res = await fetch(getApiUrl("/api/subscriptions"));
			if (!res.ok) return [];
			const json = await res.json();
			return Array.isArray(json) ? json : [];
		},
		getKey: (item) => item.id,
		onInsert: async () => {
			return { refetch: true };
		},
		onUpdate: async () => {
			return { refetch: true };
		},
		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0];
			try {
				const message = await deleteSubscriptionAction(original.id);
				toast.success(message);
				return { refetch: true };
			} catch (e) {
				subscriptionErrorToast(e);
				throw e;
			}
		},
	}),
);
