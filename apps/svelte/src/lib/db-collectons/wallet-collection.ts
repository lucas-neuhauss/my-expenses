import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { deleteWalletAction } from "$lib/remote/wallet.remote";
import { WalletSchema } from "$lib/schemas/wallet";
import { getApiUrl } from "$lib/utils/fetch";
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
			const res = await fetch(getApiUrl("/api/wallets"));
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
