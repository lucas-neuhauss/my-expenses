import type { Subscription } from "$lib/schemas/subscription";
import type { Transaction } from "$lib/schemas/transaction";
import { createTestUser, deleteTestUser } from "$lib/test-utils/database";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSubscriptionsData, upsertSubscriptionData } from "./subscription";
import { getTransactionsData, upsertTransactionData } from "./transaction";

let owner: Awaited<ReturnType<typeof createTestUser>>;
let other: typeof owner;

beforeEach(async () => {
	owner = await createTestUser();
	other = await createTestUser();
});
afterEach(async () => {
	await deleteTestUser(owner.userId);
	await deleteTestUser(other.userId);
});

function transaction(overrides: Partial<Transaction> = {}): Transaction {
	return {
		id: "new",
		type: "expense",
		cents: 1000,
		date: "2026-01-01",
		description: "Lunch",
		paid: true,
		wallet: owner.wallet.id,
		category: owner.category.id,
		...overrides,
	};
}
function subscription(overrides: Partial<Subscription> = {}): Subscription {
	return {
		id: "new",
		name: "Monthly",
		cents: 1000,
		walletId: owner.wallet.id,
		categoryId: owner.category.id,
		dayOfMonth: 1,
		startDate: "2026-01-01",
		endDate: null,
		...overrides,
	};
}

async function rejectTransaction(data: Transaction, entity: string) {
	await expect(
		Effect.runPromise(Effect.flip(upsertTransactionData({ userId: owner.userId, data }))),
	).resolves.toMatchObject({ _tag: "EntityNotFoundError", entity });
}

describe("transaction reference ownership", () => {
	it("creates transactions with the user's own references", async () => {
		await Effect.runPromise(
			upsertTransactionData({ userId: owner.userId, data: transaction() }),
		);
		expect(
			await Effect.runPromise(getTransactionsData({ userId: owner.userId })),
		).toMatchObject([
			{ walletId: owner.wallet.id, categoryId: owner.category.id, cents: -1000 },
		]);
	});
	it("rejects another user's wallet", async () => {
		await rejectTransaction(transaction({ wallet: other.wallet.id }), "wallet");
		expect(
			await Effect.runPromise(getTransactionsData({ userId: owner.userId })),
		).toEqual([]);
	});
	it("rejects another user's category for installment creation", async () => {
		await rejectTransaction(
			transaction({
				category: other.category.id,
				installmentsEnabled: true,
				installmentsCount: 2,
			}),
			"category",
		);
	});
	it.each(["wallet", "toWallet"] as const)(
		"rejects a foreign transfer %s",
		async (field) => {
			await rejectTransaction(
				transaction({
					type: "transference",
					toWallet: owner.otherWallet.id,
					[field]: other.wallet.id,
				}),
				"wallet",
			);
		},
	);
	it("rejects nonexistent references without revealing ownership", async () => {
		await rejectTransaction(transaction({ category: 2147483647 }), "category");
	});
	it("rejects foreign references on updates and keeps the original transaction", async () => {
		await Effect.runPromise(
			upsertTransactionData({ userId: owner.userId, data: transaction() }),
		);
		const [original] = await Effect.runPromise(
			getTransactionsData({ userId: owner.userId }),
		);
		await rejectTransaction(
			transaction({ id: original.id, category: other.category.id }),
			"category",
		);
		expect(
			await Effect.runPromise(getTransactionsData({ userId: owner.userId })),
		).toEqual([original]);
	});
});

describe("subscription reference ownership", () => {
	it("creates subscriptions with owned references", async () => {
		await Effect.runPromise(
			upsertSubscriptionData({ userId: owner.userId, data: subscription() }),
		);
		expect(
			await Effect.runPromise(getSubscriptionsData({ userId: owner.userId })),
		).toMatchObject([{ wallet: { name: "Bank" }, category: { name: "Food" } }]);
	});
	it.each(["walletId", "categoryId"] as const)(
		"rejects a foreign %s on create and update",
		async (field) => {
			const foreignId = field === "walletId" ? other.wallet.id : other.category.id;
			const reject = (data: Subscription) =>
				Effect.runPromise(
					Effect.flip(upsertSubscriptionData({ userId: owner.userId, data })),
				);
			await expect(reject(subscription({ [field]: foreignId }))).resolves.toMatchObject({
				_tag: "EntityNotFoundError",
			});
			await Effect.runPromise(
				upsertSubscriptionData({ userId: owner.userId, data: subscription() }),
			);
			const [original] = await Effect.runPromise(
				getSubscriptionsData({ userId: owner.userId }),
			);
			await expect(
				reject(subscription({ id: original.id, [field]: foreignId })),
			).resolves.toMatchObject({ _tag: "EntityNotFoundError" });
			expect(
				await Effect.runPromise(getSubscriptionsData({ userId: owner.userId })),
			).toEqual([original]);
		},
	);
});
