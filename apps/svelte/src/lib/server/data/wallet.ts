import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, sql } from "drizzle-orm";
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
	});
	const { id, name } = formSchema.parse(formObj);

	if (id === "new") {
		await db.insert(table.wallet).values({
			userId,
			name,
			initialBalance: 0,
		});
	} else {
		await db.update(table.wallet).set({ name }).where(eq(table.wallet.id, id));
	}

	return { ok: true };
}

export function loadWallets(userId: number) {
	return db
		.select({
			id: table.wallet.id,
			name: table.wallet.name,
			initialBalance: table.wallet.initialBalance,
			balance: sql<number>`cast((sum(${table.transaction.cents}) + ${table.wallet.initialBalance}) as int)`,
		})
		.from(table.transaction)
		.rightJoin(table.wallet, eq(table.transaction.walletId, table.wallet.id))
		.where(eq(table.wallet.userId, userId))
		.orderBy(table.wallet.name)
		.groupBy(table.transaction.userId, table.wallet.id);
}

export type LoadWallet = Awaited<ReturnType<typeof loadWallets>>[number];
