import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { createTestUser, deleteTestUser } from "$lib/test-utils/database";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	generatePendingTransactionsData,
	getSubscriptionsData,
	upsertSubscriptionData,
} from "./subscription";
import { getTransactionsData } from "./transaction";

let owner: Awaited<ReturnType<typeof createTestUser>>;
let subscriptionId: number;
beforeEach(async () => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-03-15T12:00:00"));
	owner = await createTestUser();
	await Effect.runPromise(
		upsertSubscriptionData({
			userId: owner.userId,
			data: {
				id: "new",
				name: "Monthly",
				cents: 500,
				walletId: owner.wallet.id,
				categoryId: owner.category.id,
				dayOfMonth: 1,
				startDate: "2026-01-01",
				endDate: null,
			},
		}),
	);
	const [subscription] = await Effect.runPromise(
		getSubscriptionsData({ userId: owner.userId }),
	);
	subscriptionId = subscription.id;
});
afterEach(async () => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	await deleteTestUser(owner.userId);
});
const generate = () =>
	Effect.runPromise(generatePendingTransactionsData({ userId: owner.userId }));
const transactions = () =>
	Effect.runPromise(getTransactionsData({ userId: owner.userId }));

describe("subscription generation", () => {
	it("catches up ended subscriptions without generating past the end date", async () => {
		await db
			.update(table.subscription)
			.set({ endDate: "2026-02-15" })
			.where(eq(table.subscription.id, subscriptionId));
		expect(await generate()).toBe(2);
		expect((await transactions()).map((row) => row.date).sort()).toEqual([
			"2026-01-01",
			"2026-02-01",
		]);
		expect(await generate()).toBe(0);
	});
	it("does not generate paused subscriptions", async () => {
		await db
			.update(table.subscription)
			.set({ paused: true })
			.where(eq(table.subscription.id, subscriptionId));
		expect(await generate()).toBe(0);
		expect(await transactions()).toEqual([]);
	});
	it("generates each due occurrence exactly once across concurrent requests and retries", async () => {
		const counts = await Promise.all(Array.from({ length: 8 }, generate));
		expect(counts.reduce((total, count) => total + count, 0)).toBe(3);
		expect((await transactions()).map((row) => row.date).sort()).toEqual([
			"2026-01-01",
			"2026-02-01",
			"2026-03-01",
		]);
		expect((await transactions()).map((row) => row.cents)).toEqual([-500, -500, -500]);
		expect(await generate()).toBe(0);
		expect(
			await Effect.runPromise(getSubscriptionsData({ userId: owner.userId })),
		).toMatchObject([{ lastGenerated: "2026-03-01" }]);
	});
	it("recovers a stale cursor without duplicating a previously inserted occurrence", async () => {
		await db.insert(table.transaction).values({
			userId: owner.userId,
			cents: -500,
			type: "expense",
			categoryId: owner.category.id,
			walletId: owner.wallet.id,
			subscriptionId,
			date: "2026-01-01",
		});
		expect(await generate()).toBe(2);
		expect((await transactions()).map((row) => row.date).sort()).toEqual([
			"2026-01-01",
			"2026-02-01",
			"2026-03-01",
		]);
	});
	it("rolls back inserted transactions if advancing the cursor fails, then retries safely", async () => {
		await db.execute(
			sql`ALTER TABLE subscription ADD CONSTRAINT test_reject_cursor CHECK (last_generated IS NULL)`,
		);
		try {
			await expect(
				Effect.runPromise(
					Effect.flip(generatePendingTransactionsData({ userId: owner.userId })),
				),
			).resolves.toMatchObject({ _tag: "DbError" });
			expect(await transactions()).toEqual([]);
			expect(
				await Effect.runPromise(getSubscriptionsData({ userId: owner.userId })),
			).toMatchObject([{ lastGenerated: null }]);
		} finally {
			await db.execute(sql`ALTER TABLE subscription DROP CONSTRAINT test_reject_cursor`);
		}
		expect(await generate()).toBe(3);
	});
	it("enforces occurrence uniqueness at the PostgreSQL boundary", async () => {
		await generate();
		await expect(
			db.insert(table.transaction).values({
				userId: owner.userId,
				cents: -500,
				type: "expense",
				categoryId: owner.category.id,
				walletId: owner.wallet.id,
				subscriptionId,
				date: "2026-01-01",
			}),
		).rejects.toThrow();
		expect(await transactions()).toHaveLength(3);
	});
});
