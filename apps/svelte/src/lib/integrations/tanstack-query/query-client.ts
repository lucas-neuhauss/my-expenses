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

// Create a user-scoped storage persister
function createUserStoragePersister(userId: string) {
	const userPrefix = `tanstack-query-${userId}-`;

	return createAsyncStoragePersister({
		storage: {
			getItem: (key) => get(userPrefix + key),
			setItem: (key, value) => set(userPrefix + key, value),
			removeItem: (key) => del(userPrefix + key),
		},
	});
}

// Store the current persister instance
let currentPersister = createAsyncStoragePersister({
	storage: {
		getItem: () => null, // No storage until user is known
		setItem: () => {},
		removeItem: () => {},
	},
});

export const isQueryCacheHydrated = writable(false);

let persistenceRestored: Promise<void> | null = null;
let currentUserId: string | null = null;

export function initializeQueryPersistence(userId: string | null): Promise<void> {
	if (persistenceRestored && currentUserId === userId) return persistenceRestored;

	// Clear previous persistence if user changed
	if (currentUserId !== userId && persistenceRestored) {
		queryClient.clear();
		isQueryCacheHydrated.set(false);
		persistenceRestored = null;
	}

	currentUserId = userId;
	currentPersister = userId
		? createUserStoragePersister(userId)
		: createAsyncStoragePersister({
				storage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
				},
			});

	const [, restorePromise] = persistQueryClient({
		queryClient,
		persister: currentPersister,
		maxAge: CACHE_TIME,
	});

	persistenceRestored = restorePromise;
	restorePromise.then(() => isQueryCacheHydrated.set(true));
	return restorePromise;
}
