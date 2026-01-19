import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { QueryClient } from "@tanstack/svelte-query";
import { del, get, set } from "idb-keyval";
import { writable } from "svelte/store";

const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: CACHE_TIME,
			staleTime: STALE_TIME,
		},
	},
});

const asyncStoragePersister = createAsyncStoragePersister({
	storage: {
		getItem: (key) => get(key),
		setItem: (key, value) => set(key, value),
		removeItem: (key) => del(key),
	},
});

export const isQueryCacheHydrated = writable(false);

let persistenceRestored: Promise<void> | null = null;

export function initializeQueryPersistence(): Promise<void> {
	if (persistenceRestored) return persistenceRestored;

	const [, restorePromise] = persistQueryClient({
		queryClient,
		persister: asyncStoragePersister,
		maxAge: CACHE_TIME,
	});

	persistenceRestored = restorePromise;
	restorePromise.then(() => isQueryCacheHydrated.set(true));
	return restorePromise;
}
