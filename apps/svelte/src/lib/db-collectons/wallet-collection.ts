import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import {
	deleteWalletAction,
	getWallets,
	upsertWalletCommand,
} from "$lib/remote/wallet.remote";
import { WalletSchema, type Wallet } from "$lib/schemas/wallet";
import { isHttpError } from "@sveltejs/kit";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/svelte-db";
import { toast } from "svelte-sonner";

/**
 * Surface a wallet-error toast by dispatching on the tagged error's `_tag`.
 * Any tag not in the table is treated as a generic failure; the collection
 * caller re-throws to roll back the optimistic write.
 */
function walletErrorToast(e: unknown): void {
	if (!isHttpError(e)) {
		toast.error("Something went wrong. Please try again later.");
		return;
	}
	const body = e.body as { _tag?: string; message?: string; entity?: string } | undefined;
	switch (body?._tag) {
		case "EntityNotFoundError":
			toast.error(`${body.entity ?? "Wallet"} not found`);
			return;
		case "DeleteWalletError":
			toast.error(body.message ?? "Wallet cannot be deleted");
			return;
		case "InvalidInputError":
			toast.error(body.message ?? "Invalid input");
			return;
		default:
			toast.error("Something went wrong. Please try again later.");
	}
}

export const walletCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		schema: WalletSchema,
		queryKey: ["wallet"],
		queryFn: async () => {
			const query = getWallets();
			await query.refresh();
			return query;
		},
		getKey: (item) => item.id,
		// Handle all CRUD operations
		onInsert: async ({ transaction }) => {
			const { modified, key } = transaction.mutations[0];
			try {
				await upsertWalletCommand(modified as Wallet);
				toast.success("Wallet created");
				return { refetch: true };
			} catch (e) {
				walletCollection.utils.writeDelete(key);
				walletErrorToast(e);
				throw e;
			}
		},
		onUpdate: async ({ transaction }) => {
			const { modified, original } = transaction.mutations[0];
			try {
				await upsertWalletCommand(modified as Wallet);
				toast.success("Wallet updated");
				return { refetch: false };
			} catch (e) {
				walletCollection.utils.writeUpdate(original as Wallet);
				walletErrorToast(e);
				throw e;
			}
		},
		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0];
			try {
				const message = await deleteWalletAction(original.id);
				toast.success(message);
				return { refetch: false };
			} catch (e) {
				walletErrorToast(e);
				throw e;
			}
		},
	}),
);
