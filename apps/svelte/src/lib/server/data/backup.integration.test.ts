import { BackupSchema } from "$lib/schemas/backup";
import { db } from "$lib/server/db";
import { createTestUser, deleteTestUser } from "$lib/test-utils/database";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "../../../routes/api/create-backup/+server";
import { actions } from "../../../routes/backup/+page.server";
import { createBackupData, loadBackupData } from "./backup";
import { decodeBackupFile } from "./backup-file";
import { getCategoriesData } from "./category";
import { getSubscriptionsData, upsertSubscriptionData } from "./subscription";
import { getTransactionsData, upsertTransactionData } from "./transaction";
import { getWalletsData } from "./wallet";

let owner: Awaited<ReturnType<typeof createTestUser>>;
let other: typeof owner;

beforeEach(async () => {
	owner = await createTestUser();
	other = await createTestUser();
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
	await Effect.runPromise(
		upsertTransactionData({
			userId: owner.userId,
			data: {
				id: "new",
				type: "expense",
				wallet: owner.wallet.id,
				category: owner.category.id,
				cents: 1000,
				date: "2026-01-01",
				paid: true,
				description: "Original",
			},
		}),
	);
});
afterEach(async () => {
	await deleteTestUser(owner.userId);
	await deleteTestUser(other.userId);
});

async function snapshot(userId: string) {
	return {
		wallets: await Effect.runPromise(getWalletsData(userId)),
		categories: await Effect.runPromise(getCategoriesData(userId)),
		subscriptions: await Effect.runPromise(getSubscriptionsData({ userId })),
		transactions: await Effect.runPromise(getTransactionsData({ userId })),
	};
}
async function exported() {
	const encoded = await Effect.runPromise(createBackupData({ userId: owner.userId }));
	return BackupSchema.parse(decodeBackupFile(Buffer.from(encoded, "base64")));
}

describe("backup restoration", () => {
	it("downloads actual gzip and restores it even when the browser omits the MIME type", async () => {
		const user = { id: owner.userId, email: `${owner.userId}@example.test` };
		const session = { user, expires: "2099-01-01T00:00:00.000Z" };
		const locals: App.Locals = { user, session, getSession: async () => session };
		const response = await GET({ locals } as Parameters<typeof GET>[0]);
		const bytes = new Uint8Array(await response.arrayBuffer());
		expect(Array.from(bytes.slice(0, 2))).toEqual([0x1f, 0x8b]);
		const form = new FormData();
		form.set("file", new File([bytes], "backup.gz"));
		const request = new Request("http://localhost/backup", {
			method: "POST",
			body: form,
		});
		await expect(
			actions["load-backup"]({ locals, request } as Parameters<
				(typeof actions)["load-backup"]
			>[0]),
		).resolves.toMatchObject({ ok: true });
	});
	it("returns a form validation error for corrupted gzip without deleting data", async () => {
		const before = await snapshot(owner.userId);
		const user = { id: owner.userId, email: "test@example.test" };
		const session = { user, expires: "2099-01-01T00:00:00.000Z" };
		const locals: App.Locals = { user, session, getSession: async () => session };
		const form = new FormData();
		form.set("file", new File(["not gzip"], "backup.gz", { type: "application/gzip" }));
		const request = new Request("http://localhost/backup", {
			method: "POST",
			body: form,
		});
		await expect(
			actions["load-backup"]({ locals, request } as Parameters<
				(typeof actions)["load-backup"]
			>[0]),
		).resolves.toMatchObject({ status: 400, data: { error: expect.any(String) } });
		expect(await snapshot(owner.userId)).toEqual(before);
	});
	it("round-trips an exported backup with new owned references, without touching another user", async () => {
		const otherBefore = await snapshot(other.userId);
		await Effect.runPromise(
			loadBackupData({ userId: other.userId, data: await exported() }),
		);
		const restored = await snapshot(other.userId);
		expect(restored.transactions).toMatchObject([
			{ cents: -1000, description: "Original" },
		]);
		expect(restored.transactions[0].walletId).toBe(
			restored.wallets.find((row) => row.name === "Bank")?.id,
		);
		expect(restored.transactions[0].categoryId).toBe(
			restored.categories.find((row) => row.name === "Food")?.id,
		);
		expect(restored.subscriptions).toMatchObject([
			{ name: "Monthly", wallet: { name: "Bank" }, category: { name: "Food" } },
		]);
		expect(restored.wallets[0].id).not.toBe(otherBefore.wallets[0].id);
		expect((await snapshot(owner.userId)).transactions).toMatchObject([
			{ description: "Original" },
		]);
	});
	it.each(["shape", "reference", "duplicate", "date"] as const)(
		"rejects invalid %s without deleting existing data",
		async (invalid) => {
			const before = await snapshot(owner.userId);
			const data = await exported();
			const payload: unknown = invalid === "shape" ? {} : data;
			if (invalid === "reference") data.transaction[0].wallet_id = other.wallet.id;
			if (invalid === "duplicate") data.wallet.push(data.wallet[0]);
			if (invalid === "date") data.transaction[0].date = "2026-02-30";
			await expect(
				Effect.runPromise(
					Effect.flip(loadBackupData({ userId: owner.userId, data: payload })),
				),
			).resolves.toMatchObject({ _tag: "InvalidBackupError" });
			expect(await snapshot(owner.userId)).toEqual(before);
		},
	);
	it("rolls back deletions and partial inserts when the database rejects a late insert", async () => {
		const before = await snapshot(owner.userId);
		const data = await exported();
		data.category[0].name = "Rejected restore";
		// Fault injection at the PostgreSQL boundary, not a mock of the data layer.
		await db.execute(
			sql`ALTER TABLE category ADD CONSTRAINT test_reject_restore CHECK (name <> 'Rejected restore')`,
		);
		try {
			await expect(
				Effect.runPromise(Effect.flip(loadBackupData({ userId: owner.userId, data }))),
			).resolves.toMatchObject({ _tag: "DbError" });
			expect(await snapshot(owner.userId)).toEqual(before);
		} finally {
			await db.execute(sql`ALTER TABLE category DROP CONSTRAINT test_reject_restore`);
		}
	});
	it("restores empty tables without issuing empty INSERT statements", async () => {
		await Effect.runPromise(
			loadBackupData({
				userId: owner.userId,
				data: { wallet: [], category: [], transaction: [] },
			}),
		);
		expect(await snapshot(owner.userId)).toEqual({
			wallets: [],
			categories: [],
			subscriptions: [],
			transactions: [],
		});
	});
	it("accepts legacy backups without subscriptions or installment fields", async () => {
		const data = await exported();
		const { subscription: _subscriptions, ...legacy } = data;
		legacy.transaction = legacy.transaction.map(
			({
				installment_group_id: _group,
				installment_index: _index,
				installment_total: _total,
				subscription_id: _subscription,
				...row
			}) => row,
		) as typeof legacy.transaction;
		await Effect.runPromise(loadBackupData({ userId: owner.userId, data: legacy }));
		expect((await snapshot(owner.userId)).transactions).toMatchObject([
			{ description: "Original", subscriptionId: null, installmentGroupId: null },
		]);
	});
});
