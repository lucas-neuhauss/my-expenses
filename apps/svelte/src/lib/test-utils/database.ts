import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export async function createTestUser() {
	const userId = randomUUID();
	await db
		.insert(table.user)
		.values({ id: userId, email: `${userId}@example.test`, passwordHash: "unused" });
	const [wallet] = await db
		.insert(table.wallet)
		.values({ userId, name: "Bank", initialBalance: 1000 })
		.returning();
	const [otherWallet] = await db
		.insert(table.wallet)
		.values({ userId, name: "Cash" })
		.returning();
	const categories = await db
		.insert(table.category)
		.values([
			{ userId, name: "Food", type: "expense", icon: "house.png" },
			{ userId, name: "Salary", type: "income", icon: "dollar-coin.png" },
			{
				userId,
				name: "Transfer in",
				type: "income",
				icon: "bill.png",
				unique: "transference_in",
			},
			{
				userId,
				name: "Transfer out",
				type: "expense",
				icon: "bill.png",
				unique: "transference_out",
			},
		])
		.returning();
	return {
		userId,
		wallet,
		otherWallet,
		category: categories[0],
		incomeCategory: categories[1],
	};
}

export async function deleteTestUser(userId: string) {
	await db.delete(table.transaction).where(eq(table.transaction.userId, userId));
	await db.delete(table.subscription).where(eq(table.subscription.userId, userId));
	await db.delete(table.category).where(eq(table.category.userId, userId));
	await db.delete(table.wallet).where(eq(table.wallet.userId, userId));
	await db.delete(table.user).where(eq(table.user.id, userId));
}
