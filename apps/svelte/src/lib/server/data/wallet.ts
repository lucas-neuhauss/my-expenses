import { upsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function upsertWallet({
	userId,
	data,
}: {
	userId: UserId;
	data: z.infer<typeof upsertWalletSchema>;
}) {
	const { id, name } = data;
	const initialBalance = data.initialBalance ? Math.floor(data.initialBalance * 100) : 0;

	try {
		if (!id) {
			await db.insert(table.wallet).values({
				userId,
				name,
				initialBalance,
			});
		} else {
			// Check if the wallet is owned by the user
			const wallet = await db
				.select({ id: table.wallet.id })
				.from(table.wallet)
				.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId)));
			if (!wallet) {
				throw Error("Wallet not found");
			}

			await db
				.update(table.wallet)
				.set({ name, initialBalance })
				.where(eq(table.wallet.id, id));
		}

		return id ? "Wallet updated" : "Wallet created";
	} catch (error) {
		console.error(error);
		throw Error("Something went wrong");
	}
}

export async function deleteWallet({ userId, id }: { userId: UserId; id: number }) {
	// Get the wallet to be deleted. Make sure to check if the `userId` matches
	const [wallet] = await db
		.select()
		.from(table.wallet)
		.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId)));

	if (!wallet) {
		throw Error("Category not found");
	}

	// Should not be able to delete a wallet with transactions
	const [walletTransaction] = await db
		.select({ id: table.transaction.id })
		.from(table.transaction)
		.where(eq(table.transaction.walletId, id))
		.limit(1);
	if (walletTransaction) {
		throw Error("Wallet has one or more transactions, cannot be deleted");
	}

	await db.delete(table.wallet).where(eq(table.wallet.id, id));
	return "Wallet deleted";
}

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
