import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { fail } from "@sveltejs/kit";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function upsertWallet({
	userId,
	formData,
}: {
	userId: number;
	formData: FormData;
}) {
	const formObj = Object.fromEntries(formData.entries());
	const formSchema = z.object({
		id: z.coerce.number().int().or(z.literal("new")),
		name: z.string().min(1).max(255),
		initialBalance: z.coerce.number().transform((v) => Math.round(v * 100)),
	});
	const { id, name, initialBalance } = formSchema.parse(formObj);

	if (id === "new") {
		await db.insert(table.wallet).values({
			userId,
			name,
			initialBalance,
		});
	} else {
		await db
			.update(table.wallet)
			.set({ name, initialBalance })
			.where(eq(table.wallet.id, id));
	}

	return { ok: true, toast: id === "new" ? "Wallet created" : "Wallet updated" };
}

export async function deleteWallet({ userId, id }: { userId: number; id: number }) {
	// Get the wallet to be deleted. Make sure to check if the `userId` matches
	const [wallet] = await db
		.select()
		.from(table.wallet)
		.where(and(eq(table.wallet.id, id), eq(table.wallet.userId, userId)));

	if (!wallet) {
		return fail(400, { ok: false, message: "Category not found" });
	}

	// Should not be able to delete a wallet with transactions
	const [walletTransaction] = await db
		.select({ id: table.transaction.id })
		.from(table.transaction)
		.where(eq(table.transaction.walletId, id))
		.limit(1);
	if (walletTransaction) {
		return fail(400, {
			ok: false,
			message: "Wallet has one or more transactions, cannot be deleted",
		});
	}

	await db.delete(table.wallet).where(eq(table.wallet.id, id));
	return { ok: true, toast: "Category deleted" };
}

export function loadWallets(userId: number) {
	return db
		.select({
			id: table.wallet.id,
			name: table.wallet.name,
			initialBalance: table.wallet.initialBalance,
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
