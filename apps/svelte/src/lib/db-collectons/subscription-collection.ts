import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { getApiUrl } from "$lib/utils/fetch";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/svelte-db";
import * as z from "zod";

const SubscriptionSchema = z.object({
	id: z.number(),
	name: z.string(),
	cents: z.number(),
	userId: z.string(),
	categoryId: z.number(),
	walletId: z.number(),
	dayOfMonth: z.number(),
	paused: z.boolean(),
	startDate: z.string(),
	endDate: z.string().nullable(),
	lastGenerated: z.string().nullable(),
	category: z.object({
		id: z.number(),
		name: z.string(),
		icon: z.string(),
	}),
	wallet: z.object({
		id: z.number(),
		name: z.string(),
	}),
});

export type SubscriptionWithRelations = z.infer<typeof SubscriptionSchema>;

export const subscriptionCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		schema: SubscriptionSchema,
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
		onDelete: async () => {
			return { refetch: true };
		},
	}),
);
