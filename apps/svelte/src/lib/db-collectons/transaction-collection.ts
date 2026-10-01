/**
 * Transaction Collection
 *
 * To refresh transactions from the server (e.g., after subscription
 * changes generate new transactions):
 *   transactionCollection.utils.refetch();
 */
import {
	queryClient,
	registerQueryCacheReset,
} from "$lib/integrations/tanstack-query/query-client";
import { deleteTransactionAction, getTransactions } from "$lib/remote/transaction.remote";
import { TransactionRowSchema } from "$lib/schemas/transaction";
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
		case "EntityNotFoundError":
			toast.error(body.message ?? "Transaction not found");
			return;
		case "DeleteTransactionError":
			toast.error(body.message ?? "Transaction cannot be deleted");
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
			const query = getTransactions();
			await query.refresh();
			return query;
		},
		getKey: (item) => item.id,
		// Writes are not sent from the collection: creating and editing a
		// transaction goes through the dashboard's `?/upsert-transaction`
		// form action, which owns the transference / installment fan-out.
		// The collection carries the read model and optimistic deletes.
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

registerQueryCacheReset(() => transactionCollection.cleanup());
