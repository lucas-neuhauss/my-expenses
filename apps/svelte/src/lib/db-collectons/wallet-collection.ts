import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { deleteWalletAction } from "$lib/remote/wallet.remote";
import { getApiUrl } from "$lib/utils/fetch";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/svelte-db";
import { toast } from "svelte-sonner";
import * as z from "zod";

const WalletSchema = z.object({
	id: z.number(),
	name: z.string(),
	initialBalance: z.number(),
});

export const walletCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		schema: WalletSchema,
		queryKey: ["wallet"],
		queryFn: async () => {
			const res = await fetch(getApiUrl("/api/wallets"));
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
				const res = await deleteWalletAction(original.id);
				if (!res) throw Error();
				if (res.ok) {
					walletCollection.utils.writeDelete(original.id);
					toast.success(res.message);
					return { refetch: false };
				} else {
					toast.error(res.message);
					throw Error();
				}
			} catch (e) {
				toast.error("Something went wrong. Please try again later.");
				throw e;
			}
		},
	}),
);
