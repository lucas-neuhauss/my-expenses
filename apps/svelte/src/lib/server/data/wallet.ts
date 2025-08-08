import type { UpsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema";
import { db, Db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, eq, sql } from "drizzle-orm";
import { Data, Effect } from "effect";

export class UpsertWalletError extends Data.TaggedError("UpsertWalletError")<{
	cause?: unknown;
	message: string;
	action: "create" | "update";
}> {}

export class EntityNotFoundError extends Data.TaggedError("EntityNotFoundError")<{
	entity: string;
	id: number;
	where?: string[];
}> {}

export const upsertWalletData = Effect.fn("upsertWalletData")(function* ({
	userId,
	data,
}: {
	userId: UserId;
	data: UpsertWalletSchema;
}) {
	yield* Effect.annotateCurrentSpan("args", { userId, data });
	const db = yield* Db;
	const { id, name } = data;
	const action: "create" | "update" = !id ? "create" : "update";
	const initialBalance = data.initialBalance ? Math.floor(data.initialBalance * 100) : 0;

	switch (action) {
		case "create": {
			yield* db.insert(table.wallet).values({
				userId,
				name,
				initialBalance,
			});
			return "Wallet created";
		}
		case "update": {
			// Check if the wallet is owned by the user
			const wallet = yield* db
				.select({ id: table.wallet.id })
				.from(table.wallet)
				.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId)));
			if (!wallet) {
				yield* new EntityNotFoundError({
					entity: "wallet",
					id,
					where: [`wallet.userId = ${userId}`],
				});
			}

			yield* db
				.update(table.wallet)
				.set({ name, initialBalance })
				.where(eq(table.wallet.id, id));
			return "Wallet updated";
		}
	}
});

class DeleteWalletError extends Data.TaggedError("DeleteWalletError")<{
	message: string;
}> {}
export const deleteWalletData = Effect.fn("deleteWalletData")(function* ({
	userId,
	id,
}: {
	userId: UserId;
	id: number;
}) {
	const db = yield* Db;
	// Get the wallet to be deleted. Make sure to check if the `userId` matches
	const [wallet] = yield* db
		.select()
		.from(table.wallet)
		.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId)));

	if (!wallet) {
		return yield* new EntityNotFoundError({
			entity: "category",
			id,
			where: [`category.userId = ${userId}`],
		});
	}

	// Should not be able to delete a wallet with transactions
	const [walletTransaction] = yield* db
		.select({ id: table.transaction.id })
		.from(table.transaction)
		.where(eq(table.transaction.walletId, id))
		.limit(1);
	if (walletTransaction) {
		yield* new DeleteWalletError({
			message: "Wallet has one or more transactions, cannot be deleted",
		});
	}
	yield* db.delete(table.wallet).where(eq(table.wallet.id, id));
	return "Wallet deleted";
});

export function loadWallets(userId: UserId) {
	return db
		.select({
			id: table.wallet.id,
			name: table.wallet.name,
			initialBalance:
				sql<number>`ROUND(CAST(${table.wallet.initialBalance} AS numeric) / 100, 2)`.as(
					"initialBalance",
				),
			balance: sql<number>`cast((COALESCE(SUM(${table.transaction.cents}), 0) + ${table.wallet.initialBalance}) as int)`,
		})
		.from(table.transaction)
		.rightJoin(
			table.wallet,
			and(
				eq(table.transaction.walletId, table.wallet.id),
				eq(table.transaction.paid, true),
			),
		)
		.where(eq(table.wallet.userId, userId))
		.orderBy(table.wallet.name)
		.groupBy(table.transaction.userId, table.wallet.id);
}

export type LoadWallet = Awaited<ReturnType<typeof loadWallets>>[number];
