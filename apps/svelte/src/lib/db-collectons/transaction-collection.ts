/**
 * Transaction Collection
 *
 * To refresh transactions from the server (e.g., after subscription changes generate new transactions):
 *   transactionCollection.utils.refetch();
 */
import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { deleteTransactionAction } from "$lib/remote/transaction.remote";
import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { toast } from "svelte-sonner";
import * as z from "zod";

const TransactionSchema = z.object({
	id: z.number(),
	cents: z.number(),
	type: z.enum(["income", "expense"]),
	description: z.string().nullable(),
	categoryId: z.number(),
	walletId: z.number(),
	transferenceId: z.string().nullable(),
	installmentGroupId: z.string().nullable(),
	installmentIndex: z.number().nullable(),
	installmentTotal: z.number().nullable(),
	subscriptionId: z.number().nullable(),
	paid: z.boolean(),
	date: z.string(),
	transferenceFrom: z
		.object({
			id: z.number(),
			walletId: z.number(),
		})
		.nullable(),
	transferenceTo: z
		.object({
			id: z.number(),
			walletId: z.number(),
		})
		.nullable(),
});

export const transactionCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		schema: TransactionSchema,
		queryKey: ["transaction"],
		queryFn: async () => {
			const res = await fetch("/api/transactions");
			const json = await res.json();
			return json;
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
				const res = await deleteTransactionAction(original.id);
				if (!res) throw Error();
				if (res.ok) {
					toast.success(res.toast);

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
				} else {
					toast.error(res.toast);
					throw Error();
				}
			} catch (e) {
				toast.error("Something went wrong. Please try again later.");
				throw e;
			}
		},
	}),
);
