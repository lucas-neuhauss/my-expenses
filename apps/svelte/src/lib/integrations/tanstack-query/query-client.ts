import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
	persistQueryClientRestore,
	persistQueryClientSubscribe,
} from "@tanstack/query-persist-client-core";
import { dehydrate, hydrate, QueryClient } from "@tanstack/svelte-query";
import { del, get, keys, set } from "idb-keyval";
import { writable } from "svelte/store";

const CACHE_TIME = 1000 * 60 * 60 * 24;
const STALE_TIME = 1000 * 60 * 5;
const CACHE_BUSTER = "user-cache-v2"; // Discard caches potentially mixed by older releases.
const USER_CACHE_PREFIX = "tanstack-query-";

export const queryClient = new QueryClient({
	defaultOptions: { queries: { gcTime: CACHE_TIME, staleTime: STALE_TIME } },
});
export const isQueryCacheHydrated = writable(false);
export const queryCacheUserId = writable<string | null>(null);

const resets = new Set<() => Promise<void>>();
/** Collections retain rows independently of QueryClient, so both must be reset. */
export function registerQueryCacheReset(reset: () => Promise<void>): () => void {
	resets.add(reset);
	return () => {
		resets.delete(reset);
	};
}

let currentUserId: string | null | undefined;
let generation = 0;
let unsubscribe: (() => void) | undefined;
let ready: Promise<void> | undefined;
let resetQueue = Promise.resolve();

export function initializeQueryPersistence(userId: string | null): Promise<void> {
	if (currentUserId === userId && ready) return ready;

	currentUserId = userId;
	const sessionGeneration = ++generation;
	// Stop all old subscriptions before clearing or hydrating any new user's queries.
	unsubscribe?.();
	unsubscribe = undefined;
	isQueryCacheHydrated.set(false);
	queryCacheUserId.set(null);

	// Serialize resets so an older cleanup cannot remove a newer user's queries.
	resetQueue = resetQueue.then(async () => {
		await queryClient.cancelQueries();
		await Promise.all([...resets].map((reset) => reset()));
		await queryClient.cancelQueries();
		queryClient.clear();
	});

	ready = (async () => {
		await resetQueue;
		if (sessionGeneration !== generation) return;
		if (!userId) {
			// Also handles logout through a full document navigation, where memory was lost.
			try {
				const cachedKeys = await keys();
				if (sessionGeneration !== generation) return;
				await Promise.all(
					cachedKeys
						.filter((key) => typeof key === "string" && key.startsWith(USER_CACHE_PREFIX))
						.map((key) => del(key)),
				);
			} catch (error) {
				console.warn("Unable to clear persisted query cache", error);
			}
			return;
		}

		const persister = createAsyncStoragePersister({
			key: `${USER_CACHE_PREFIX}${userId}-REACT_QUERY_OFFLINE_CACHE`,
			storage: {
				getItem: (key) => get(key),
				// Includes throttled saves queued by the previous session.
				setItem: (key, value) =>
					sessionGeneration === generation ? set(key, value) : Promise.resolve(),
				removeItem: (key) => del(key),
			},
		});
		// Restoring to a staging client is essential: unsubscribe alone cannot stop
		// an already-running persistQueryClientRestore from hydrating late.
		const staging = new QueryClient();
		try {
			await persistQueryClientRestore({
				queryClient: staging,
				persister,
				maxAge: CACHE_TIME,
				buster: CACHE_BUSTER,
			});
		} catch (error) {
			// IndexedDB is an optimization: keep live queries usable if storage fails.
			console.warn("Unable to restore persisted query cache", error);
		}
		try {
			if (sessionGeneration !== generation) return;
			hydrate(queryClient, dehydrate(staging));
			// Cached rows can render immediately, but verify them with the current server session.
			void queryClient.invalidateQueries({ refetchType: "none" });
			unsubscribe = persistQueryClientSubscribe({
				queryClient,
				persister,
				buster: CACHE_BUSTER,
			});
			queryCacheUserId.set(userId);
			isQueryCacheHydrated.set(true);
		} finally {
			staging.clear();
		}
	})();
	return ready;
}
