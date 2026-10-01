import { getCategoriesData } from "$lib/server/data/category";
import { getTransactionsData, upsertTransactionData } from "$lib/server/data/transaction";
import { getWalletsData } from "$lib/server/data/wallet";
import { createTestUser, deleteTestUser } from "$lib/test-utils/database";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "./+server";

let owner: Awaited<ReturnType<typeof createTestUser>>;
let other: typeof owner;
let foreignTransactionId: number;

beforeEach(async () => {
	owner = await createTestUser();
	other = await createTestUser();
	await Effect.runPromise(
		upsertTransactionData({
			userId: other.userId,
			data: {
				id: "new",
				type: "expense",
				cents: 1000,
				date: "2026-01-01",
				description: "Other user's expense",
				paid: true,
				wallet: other.wallet.id,
				category: other.category.id,
			},
		}),
	);
	const [transaction] = await Effect.runPromise(
		getTransactionsData({ userId: other.userId }),
	);
	foreignTransactionId = transaction.id;
});
afterEach(async () => {
	await deleteTestUser(owner.userId);
	await deleteTestUser(other.userId);
});

function event(data: unknown, userId: string | null = owner.userId) {
	const user = userId ? { id: userId, email: "test@example.test" } : null;
	const session = user ? { user, expires: "2099-01-01T00:00:00.000Z" } : null;
	const locals: App.Locals = { user, session, getSession: async () => session };
	const request = new Request("http://localhost/api/test/seed", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	return { locals, request } as Parameters<typeof POST>[0];
}
async function snapshot(userId: string) {
	return {
		wallets: await Effect.runPromise(getWalletsData(userId)),
		categories: await Effect.runPromise(getCategoriesData(userId)),
		transactions: await Effect.runPromise(getTransactionsData({ userId })),
	};
}

describe("test seed API ownership", () => {
	it.each([POST, DELETE])("requires authentication", async (handler) => {
		await expect(handler(event({ all: true }, null))).rejects.toMatchObject({
			status: 401,
		});
	});
	it("seeds and deletes only the current user's rows", async () => {
		const otherBefore = await snapshot(other.userId);
		const response = await POST(
			event({
				transaction: {
					description: "Owner expense",
					type: "expense",
					cents: -100,
					walletId: owner.wallet.id,
					categoryId: owner.category.id,
				},
			}),
		);
		const data = await response.json();
		expect(data.transaction.userId).toBe(owner.userId);
		await DELETE(event({ transactionId: data.transaction.id }));
		expect((await snapshot(owner.userId)).transactions).toEqual([]);
		expect(await snapshot(other.userId)).toEqual(otherBefore);
	});
	it.each(["walletId", "categoryId", "transactionId"] as const)(
		"refuses deletion of another user's %s",
		async (field) => {
			const otherBefore = await snapshot(other.userId);
			const id =
				field === "walletId"
					? other.otherWallet.id
					: field === "categoryId"
						? other.incomeCategory.id
						: foreignTransactionId;
			await expect(DELETE(event({ [field]: id }))).rejects.toMatchObject({ status: 404 });
			expect(await snapshot(other.userId)).toEqual(otherBefore);
		},
	);
	it.each(["walletId", "categoryId"] as const)(
		"rejects foreign transaction %s before creating any requested seed rows",
		async (field) => {
			const before = await snapshot(owner.userId);
			const response = POST(
				event({
					wallet: { name: "Must not be created" },
					category: { name: "Must not be created", type: "expense" },
					transaction: {
						description: "Invalid",
						type: "expense",
						cents: -100,
						walletId: owner.wallet.id,
						categoryId: owner.category.id,
						[field]: field === "walletId" ? other.wallet.id : other.category.id,
					},
				}),
			);
			await expect(response).rejects.toMatchObject({ status: 404 });
			expect(await snapshot(owner.userId)).toEqual(before);
		},
	);
	it("validates every targeted entity before a mixed cleanup starts", async () => {
		const response = await POST(
			event({ transaction: { description: "Keep me", type: "expense", cents: -100 } }),
		);
		const { transaction } = await response.json();
		const before = await snapshot(owner.userId);
		await expect(
			DELETE(event({ transactionId: transaction.id, walletId: other.otherWallet.id })),
		).rejects.toMatchObject({ status: 404 });
		expect(await snapshot(owner.userId)).toEqual(before);
	});
	it("scopes full cleanup and preserves infrastructure categories", async () => {
		const otherBefore = await snapshot(other.userId);
		await DELETE(event({ all: true }));
		const remaining = await snapshot(owner.userId);
		expect(remaining.wallets).toEqual([]);
		expect(remaining.transactions).toEqual([]);
		expect(remaining.categories.map((row) => row.unique).sort()).toEqual([
			"transference_in",
			"transference_out",
		]);
		expect(await snapshot(other.userId)).toEqual(otherBefore);
	});
	it.each([
		{},
		{ walletId: -1 },
		{ transactionId: 1.5 },
		{ categoryId: "1000" },
		{ all: "true" },
		{ walletId: 1000, userId: "someone-else" },
	])("rejects malformed cleanup input", async (input) => {
		await expect(DELETE(event(input))).rejects.toMatchObject({ status: 400 });
	});
	it("rejects invalid dates, fractional cents and unrecognized fields on seed", async () => {
		const before = await snapshot(owner.userId);
		for (const input of [
			{
				transaction: {
					description: "Invalid",
					type: "expense",
					cents: -100,
					date: "2026-02-30",
				},
			},
			{ transaction: { description: "Invalid", type: "expense", cents: 1.5 } },
			{ wallet: { name: "Invalid", userId: other.userId } },
		]) {
			await expect(POST(event(input))).rejects.toMatchObject({ status: 400 });
		}
		expect(await snapshot(owner.userId)).toEqual(before);
	});
});
