import { db } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

type BackupData = {
	wallet: {
		id: number;
		userId: number;
		name: string;
		initialBalance: number;
	}[];
	category: {
		id: number;
		name: string;
		type: "expense" | "income";
		userId: number;
		parentId: number | null;
		icon: string;
		unique: "transference_in" | "transference_out" | null;
	}[];
	transaction: {
		id: number;
		cents: number;
		type: "expense" | "income";
		description: string | null;
		userId: number;
		categoryId: number;
		walletId: number;
		transferenceId: string | null;
		date: string;
		createdAt: string;
		updatedAt: string;
	}[];
};

export async function loadBackup(userId: number, data: BackupData) {
	const BACKUP_USER_ID = 1000;

	const maps = {
		walletsMap: new Map<number, number>(),
		categoriesMap: new Map<number, number>(),
		transactionsMap: new Map<number, number>(),
	};

	// 2. Clear all user's data
	await db.delete(table.transaction).where(eq(table.transaction.userId, userId));
	await db.delete(table.category).where(eq(table.category.userId, userId));
	await db.delete(table.wallet).where(eq(table.wallet.userId, userId));

	// 3. Create wallets, and map the old ids with the new ids
	const walletsData = data.wallet.filter((w) => w.userId === BACKUP_USER_ID);
	const newWallets = await db
		.insert(table.wallet)
		.values(
			walletsData.map((w) => {
				return {
					userId,
					name: w.name,
					initialBalance: w.initialBalance,
				};
			}),
		)
		.returning({ id: table.wallet.id });
	for (let i = 0; i < walletsData.length; i++) {
		maps.walletsMap.set(walletsData[i].id, newWallets[i].id);
	}

	// 4. Create categories, and map the old ids with the new ids
	// First we need to create the parent categories
	const parentCategories = data.category.filter(
		(c) => c.userId === BACKUP_USER_ID && c.parentId === null,
	);
	const newParentCategories = await db
		.insert(table.category)
		.values(
			parentCategories.map((c) => {
				return {
					userId,
					name: c.name,
					icon: c.icon,
					type: c.type,
					unique: c.unique,
					parentId: null,
				};
			}),
		)
		.returning({ id: table.category.id });
	for (let i = 0; i < parentCategories.length; i++) {
		maps.categoriesMap.set(parentCategories[i].id, newParentCategories[i].id);
	}

	// Then we can create the child categories
	const childCategories = data.category.filter(
		(c) => c.userId === BACKUP_USER_ID && c.parentId !== null,
	);
	const newChildCategories = await db
		.insert(table.category)
		.values(
			childCategories.map((c) => {
				return {
					userId,
					name: c.name,
					icon: c.icon,
					type: c.type,
					unique: c.unique,
					parentId: maps.categoriesMap.get(c.parentId as number),
				};
			}),
		)
		.returning({ id: table.category.id });
	for (let i = 0; i < childCategories.length; i++) {
		maps.categoriesMap.set(childCategories[i].id, newChildCategories[i].id);
	}

	// 5. Create all the transactions, and map the old ids with the new ids
	const transactionsData = data.transaction.filter((t) => t.userId === BACKUP_USER_ID);
	const newTransactions = await db
		.insert(table.transaction)
		.values(
			transactionsData.map((t) => ({
				userId,
				transferenceId: t.transferenceId,
				type: t.type,
				description: t.description,
				createdAt: new Date(t.createdAt),
				updatedAt: new Date(t.updatedAt),
				cents: t.cents,
				date: t.date,
				categoryId: maps.categoriesMap.get(t.categoryId)!,
				walletId: maps.walletsMap.get(t.walletId)!,
			})),
		)
		.returning({ id: table.transaction.id });
	for (let i = 0; i < transactionsData.length; i++) {
		maps.transactionsMap.set(transactionsData[i].id, newTransactions[i].id);
	}

	return { ok: true };
}

export async function createBackup() {
	const backupData: any = {};
	for (const [key, value] of Object.entries(schema)) {
		console.log(`key: ${key} | isTable: ${value instanceof PgTable}`);
		if (value instanceof PgTable) {
			const tableRows = await db.select().from(value);
			backupData[key] = tableRows;
		}
	}
	return backupData;
}
