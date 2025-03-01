import { db } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";
import * as table from "$lib/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { gzip } from "pako";

type BackupData = {
	wallet: {
		id: number;
		user_id: number;
		name: string;
		initial_balance: number;
	}[];
	category: {
		id: number;
		name: string;
		type: "expense" | "income";
		user_id: number;
		parent_id: number | null;
		icon: string;
		unique: "transference_in" | "transference_out" | null;
	}[];
	transaction: {
		id: number;
		cents: number;
		type: "expense" | "income";
		description: string | null;
		user_id: number;
		category_id: number;
		wallet_id: number;
		transference_id: string | null;
		date: string;
		created_at: string;
		updated_at: string;
	}[];
};

export async function loadBackup(userId: number, data: BackupData) {
	const maps = {
		walletsMap: new Map<number, number>(),
		categoriesMap: new Map<number, number>(),
		transactionsMap: new Map<number, number>(),
	};

	// 1. Clear all user's data
	await db.delete(table.transaction).where(eq(table.transaction.userId, userId));
	await db.delete(table.category).where(eq(table.category.userId, userId));
	await db.delete(table.wallet).where(eq(table.wallet.userId, userId));

	// 2. Create wallets, and map the old ids with the new ids
	const walletsData = data.wallet;
	const newWallets = await db
		.insert(table.wallet)
		.values(
			walletsData.map((w) => {
				return {
					userId,
					name: w.name,
					initialBalance: w.initial_balance,
				};
			}),
		)
		.returning({ id: table.wallet.id });
	for (let i = 0; i < walletsData.length; i++) {
		maps.walletsMap.set(walletsData[i].id, newWallets[i].id);
	}

	// 3. Create categories, and map the old ids with the new ids
	// First we need to create the parent categories
	const parentCategories = data.category.filter((c) => c.parent_id === null);
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
	const childCategories = data.category.filter((c) => c.parent_id !== null);
	if (childCategories.length > 0) {
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
						parentId: maps.categoriesMap.get(c.parent_id as number),
					};
				}),
			)
			.returning({ id: table.category.id });
		for (let i = 0; i < childCategories.length; i++) {
			maps.categoriesMap.set(childCategories[i].id, newChildCategories[i].id);
		}
	}

	// 4. Create all the transactions, and map the old ids with the new ids
	const transactionsData = data.transaction;
	const newTransactions = await db
		.insert(table.transaction)
		.values(
			transactionsData.map((t) => ({
				userId,
				transferenceId: t.transference_id,
				type: t.type,
				description: t.description,
				createdAt: new Date(t.created_at),
				updatedAt: new Date(t.updated_at),
				cents: t.cents,
				date: t.date,
				categoryId: maps.categoriesMap.get(t.category_id)!,
				walletId: maps.walletsMap.get(t.wallet_id)!,
			})),
		)
		.returning({ id: table.transaction.id });
	for (let i = 0; i < transactionsData.length; i++) {
		maps.transactionsMap.set(transactionsData[i].id, newTransactions[i].id);
	}

	return { ok: true };
}

export async function createBackup(userId: number) {
	const TABLES = ["wallet", "transaction", "category"];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tables: any = {};

	for (const [key, value] of Object.entries(schema)) {
		if (value instanceof PgTable && TABLES.includes(key)) {
			console.log(`Table: ${key}`);
			const rows = await db.execute(
				sql.raw(`select * from ${key} where ${key}.user_id = ${userId}`),
			);
			tables[key] = Array.from(rows);
		}
	}

	// Apply gzip compression
	const compressedData = gzip(JSON.stringify(tables), {});

	// Convert to base64 for safe storage
	return Buffer.from(compressedData).toString("base64");
}
