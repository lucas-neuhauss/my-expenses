/**
 * Transaction Collection
 *
 * To refresh transactions from the server (e.g., after subscription
 * changes generate new transactions):
 *   transactionCollection.utils.refetch();
 */
import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import {
	deleteTransactionAction,
	getTransactions,
	upsertTransactionCommand,
} from "$lib/remote/transaction.remote";
import { TransactionRowSchema, type TransactionRow } from "$lib/schemas/transaction";
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
		case "UpsertTransactionValidationError":
			toast.error(body.message ?? "Invalid transaction data");
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
		// Handle all CRUD operations
		onInsert: async ({ transaction }) => {
			const { modified, key } = transaction.mutations[0];
			try {
				await upsertTransactionCommand(modified as TransactionRow);
				toast.success("Transaction created");
				// Refetch to get any additional rows created (installments, transfers)
				return { refetch: true };
			} catch (e) {
				transactionCollection.utils.writeDelete(key);
				transactionErrorToast(e);
				throw e;
			}
		},
		onUpdate: async ({ transaction }) => {
			const { modified, original } = transaction.mutations[0];
			try {
				await upsertTransactionCommand(modified as TransactionRow);
				toast.success("Transaction updated");
				return { refetch: false };
			} catch (e) {
				transactionCollection.utils.writeUpdate(original as TransactionRow);
				transactionErrorToast(e);
				throw e;
			}
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
