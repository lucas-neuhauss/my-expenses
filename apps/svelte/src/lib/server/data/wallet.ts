import type { UpsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema";
import { EntityNotFoundError } from "$lib/errors/db";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, eq, sql } from "drizzle-orm";
import { Data, Effect } from "effect";

export class UpsertWalletError extends Data.TaggedError("UpsertWalletError")<{
	cause?: unknown;
	message: string;
	action: "create" | "update";
}> {}

export const upsertWalletData = Effect.fn("upsertWalletData")(function* ({
	userId,
	data,
}: {
	userId: UserId;
	data: UpsertWalletSchema;
}) {
	yield* Effect.annotateCurrentSpan("args", { userId, data });
	const { id, name } = data;
	const action: "create" | "update" = !id ? "create" : "update";
	const initialBalance = data.initialBalance ? Math.floor(data.initialBalance * 100) : 0;

	switch (action) {
		case "create": {
			yield* exec(
				db.insert(table.wallet).values({
					userId,
					name,
					initialBalance,
				}),
			);
			return "Wallet created";
		}
		case "update": {
			// Check if the wallet is owned by the user
			const wallet = yield* exec(
				db
					.select({ id: table.wallet.id })
					.from(table.wallet)
					.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId))),
			);
			if (!wallet) {
				yield* new EntityNotFoundError({
					entity: "wallet",
					id,
					where: [`wallet.userId = ${userId}`],
				});
			}

			yield* exec(
				db
					.update(table.wallet)
					.set({ name, initialBalance })
					.where(eq(table.wallet.id, id)),
			);
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
	yield* Effect.annotateCurrentSpan("args", { userId, id });
	const [wallet] = yield* exec(
		db
			.select({
				id: table.wallet.id,
				hasTransactions: sql<boolean>`EXISTS(
            SELECT 1 FROM ${table.transaction}
            WHERE ${table.transaction.walletId} = ${id}
        )`.as("hasTransactions"),
			})
			.from(table.wallet)
			.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId))),
	);

	if (!wallet) {
		return yield* new EntityNotFoundError({
			entity: "category",
			id,
			where: [`category.userId = ${userId}`],
		});
	}
	// Should not be able to delete a wallet with transactions
	if (wallet.hasTransactions) {
		yield* new DeleteWalletError({
			message: "Wallet has one or more transactions, cannot be deleted",
		});
	}

	yield* exec(db.delete(table.wallet).where(eq(table.wallet.id, id)));
	return "Wallet deleted";
});

export function loadWallets(userId: UserId) {
	return exec(
		db
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
			.groupBy(table.transaction.userId, table.wallet.id),
	);
}
export type LoadWallet = Effect.Effect.Success<ReturnType<typeof loadWallets>>[number];
