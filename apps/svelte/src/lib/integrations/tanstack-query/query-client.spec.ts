import { createCollection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { dehydrate, QueryClient } from "@tanstack/svelte-query";
import { get as getStored } from "idb-keyval";
import { get as getStore } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	initializeQueryPersistence,
	isQueryCacheHydrated,
	queryCacheUserId,
	queryClient,
	registerQueryCacheReset,
} from "./query-client";

const { storage, writes } = vi.hoisted(() => ({
	storage: new Map<string, string>(),
	writes: [] as Array<{ key: string; value: string }>,
}));
vi.mock("idb-keyval", () => ({
	get: vi.fn(async (key: string) => storage.get(key)),
	set: vi.fn(async (key: string, value: string) => {
		writes.push({ key, value });
		storage.set(key, value);
	}),
	del: vi.fn(async (key: string) => {
		storage.delete(key);
	}),
	keys: vi.fn(async () => [...storage.keys()]),
}));

const key = (user: string) => `tanstack-query-${user}-REACT_QUERY_OFFLINE_CACHE`;
function cachedSecret(secret: string, buster = "user-cache-v2") {
	const client = new QueryClient();
	client.setQueryData(["old-user-secret"], secret);
	const data = JSON.stringify({
		timestamp: Date.now(),
		buster,
		clientState: dehydrate(client),
	});
	client.clear();
	return data;
}
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
beforeEach(async () => {
	await initializeQueryPersistence(null);
	storage.clear();
	writes.length = 0;
	vi.mocked(getStored).mockImplementation(async (key) => storage.get(String(key)));
	vi.useFakeTimers();
});
afterEach(async () => {
	await initializeQueryPersistence(null);
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("user-scoped query persistence", () => {
	it("does not send a new user's cache to the previous user's persister", async () => {
		await initializeQueryPersistence("A");
		queryClient.setQueryData(["wallet"], "A private wallet");
		await vi.advanceTimersByTimeAsync(2000);
		await initializeQueryPersistence("B");
		expect(queryClient.getQueryData(["wallet"])).toBeUndefined();
		queryClient.setQueryData(["wallet"], "B private wallet");
		await vi.advanceTimersByTimeAsync(2000);
		expect(
			writes
				.filter((write) => write.key === key("A"))
				.every((write) => !write.value.includes("B private wallet")),
		).toBe(true);
		expect(storage.get(key("B"))).toContain("B private wallet");
	});
	it("suppresses throttled writes queued before a user switch", async () => {
		await initializeQueryPersistence("A");
		queryClient.setQueryData(["wallet"], "A wallet");
		await initializeQueryPersistence("B");
		queryClient.setQueryData(["wallet"], "B wallet");
		await vi.advanceTimersByTimeAsync(2000);
		expect(writes.some((write) => write.key === key("A"))).toBe(false);
		expect(storage.get(key("B"))).toContain("B wallet");
	});
	it("clears memory and persisted financial data on logout", async () => {
		await initializeQueryPersistence("A");
		queryClient.setQueryData(["wallet"], "Private wallet");
		await vi.advanceTimersByTimeAsync(2000);
		storage.set("unrelated-app-key", "keep");
		await initializeQueryPersistence(null);
		await vi.advanceTimersByTimeAsync(2000);
		expect(queryClient.getQueryCache().getAll()).toEqual([]);
		expect(storage.has(key("A"))).toBe(false);
		expect(storage.get("unrelated-app-key")).toBe("keep");
		expect(getStore(isQueryCacheHydrated)).toBe(false);
		expect(getStore(queryCacheUserId)).toBeNull();
	});
	it.each(["B", "A"])(
		"ignores a delayed previous restore even when the next user is %s",
		async (nextUser) => {
			const loading = deferred<void>();
			const oldRead = deferred<string>();
			vi.mocked(getStored).mockImplementationOnce(async () => {
				loading.resolve(undefined);
				return oldRead.promise;
			});
			const oldRestore = initializeQueryPersistence("A");
			await loading.promise;
			await initializeQueryPersistence("B");
			if (nextUser === "A") await initializeQueryPersistence("A");
			queryClient.setQueryData(["wallet"], `${nextUser} current wallet`);
			oldRead.resolve(cachedSecret("A stale secret"));
			await oldRestore;
			expect(queryClient.getQueryData(["old-user-secret"])).toBeUndefined();
			expect(queryClient.getQueryData(["wallet"])).toBe(`${nextUser} current wallet`);
			expect(getStore(queryCacheUserId)).toBe(nextUser);
			expect(getStore(isQueryCacheHydrated)).toBe(true);
		},
	);
	it("invalidates legacy caches that may already contain mixed-user data", async () => {
		storage.set(key("B"), cachedSecret("A leaked secret", ""));
		await initializeQueryPersistence("B");
		expect(queryClient.getQueryData(["old-user-secret"])).toBeUndefined();
		expect(storage.has(key("B"))).toBe(false);
	});
	it("preserves current data when initialized again for the same user", async () => {
		await initializeQueryPersistence("A");
		queryClient.setQueryData(["wallet"], "A wallet");
		await initializeQueryPersistence("A");
		expect(queryClient.getQueryData(["wallet"])).toBe("A wallet");
	});
	it("keeps live queries usable when IndexedDB restoration fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.mocked(getStored).mockRejectedValueOnce(new Error("Storage unavailable"));
		await initializeQueryPersistence("A");
		expect(getStore(isQueryCacheHydrated)).toBe(true);
		expect(getStore(queryCacheUserId)).toBe("A");
		expect(
			await queryClient.fetchQuery({
				queryKey: ["live"],
				queryFn: async () => "Live data",
			}),
		).toBe("Live data");
	});
	it("clears TanStack collection rows, then permits loading the new user's rows", async () => {
		await initializeQueryPersistence("A");
		let rows = [{ id: 1, name: "A private wallet" }];
		const collection = createCollection(
			queryCollectionOptions({
				queryClient,
				queryKey: ["privacy-collection"],
				queryFn: async () => rows,
				getKey: (row) => row.id,
			}),
		);
		const unregister = registerQueryCacheReset(() => collection.cleanup());
		try {
			await collection.preload();
			expect([...collection.values()]).toMatchObject([
				{ id: 1, name: "A private wallet" },
			]);
			await initializeQueryPersistence("B");
			expect([...collection.values()]).toEqual([]);
			rows = [{ id: 2, name: "B private wallet" }];
			await collection.preload();
			expect([...collection.values()]).toMatchObject([
				{ id: 2, name: "B private wallet" },
			]);
		} finally {
			unregister();
			await collection.cleanup();
		}
	});
});
