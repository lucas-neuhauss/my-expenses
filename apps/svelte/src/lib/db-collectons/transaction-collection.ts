/**
 * Transaction Collection
 *
 * To refresh transactions from the server (e.g., after subscription
 * changes generate new transactions):
 *   transactionCollection.utils.refetch();
 */
import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { deleteTransactionAction } from "$lib/remote/transaction.remote";
import { TransactionRowSchema } from "$lib/schemas/transaction";
import { getApiUrl } from "$lib/utils/fetch";
import { isHttpError } from "@sveltejs/kit";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { toast } from "svelte-sonner";

/**
 * Surface a transaction-error toast by dispatching on the tagged
 * error's `_tag`. Any tag not in the table is treated as a generic
 * failure; the collection caller re-throws to roll back the optimistic
 * write.
 */
function transactionErrorToast(e: unknown): void {
	if (!isHttpError(e)) {
		toast.error("Something went wrong. Please try again later.");
		return;
	}
	const body = e.body as { _tag?: string; message?: string } | undefined;
	switch (body?._tag) {
		case "InvalidInputError":
			toast.error(body.message ?? "Invalid input");
			return;
		default:
			toast.error("Something went wrong. Please try again later.");
	}
}

export const transactionCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		// The collection's row shape is a documented projection of the
		// canonical `Transaction` schema; see
		// `src/lib/schemas/transaction.ts`.
		schema: TransactionRowSchema,
		queryKey: ["transaction"],
		queryFn: async () => {
			const res = await fetch(getApiUrl("/api/transactions"));
			if (!res.ok) return [];
			const json = await res.json();
			return Array.isArray(json) ? json : [];
		},
		getKey: (item) => item.id,
		// Handle all CRUD operations
		onInsert: async () => {
			return { refetch: false };
		},
		onUpdate: async () => {
			return { refetch: false };
		},
		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0];

			try {
				const message = await deleteTransactionAction(original.id);
				toast.success(message);

				transactionCollection.utils.writeBatch(() => {
					// Also delete the linked transaction for transferences
					const linkedId =
						original.type === "income"
							? original.transferenceFrom?.id
							: original.transferenceTo?.id;
					transactionCollection.utils.writeDelete(original.id);
					if (linkedId) {
						transactionCollection.utils.writeDelete(linkedId);
					}
				});

				return { refetch: false };
			} catch (e) {
				transactionErrorToast(e);
				throw e;
			}
		},
	}),
);
