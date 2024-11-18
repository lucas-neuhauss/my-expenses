import { db } from "$lib/server/db/index.js";
import * as table from "$lib/server/db/schema";
import { error, json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { resolve } from "path";

export async function POST({ locals }) {
	const user = locals.user;
	if (!user) {
		return error(400, "Something went wrong");
	}
	const userId = user.id;
	const BACKUP_USER_ID = 56;

	try {
		const filePath = resolve("/home/neuhaus/Desktop", "expenses-2024-11-03_10_08.json");

		// 1. Read the backup json
		const fileContent = await readFile(filePath, "utf-8");

		type BackupData = {
			wallets: {
				id: number;
				userId: number;
				name: string;
				initialBalance: number;
			}[];
			categories: {
				id: number;
				title: string;
				type: "expense" | "income";
				userId: number;
				parentId: number | null;
				iconName: string;
				unique: "transference_in" | "transference_out" | null;
			}[];
			transactions: {
				id: number;
				cents: number;
				type: "expense" | "income";
				description: string | null;
				userId: number;
				categoryId: number;
				walletId: number;
				isTransference: boolean;
				timestamp: string;
				createdAt: string;
				updatedAt: string;
			}[];
			transferences: {
				id: number;
				transactionOutId: number;
				transactionInId: number;
			}[];
		};
		const data: BackupData = JSON.parse(fileContent);
		const maps = {
			walletsMap: new Map<number, number>(),
			categoriesMap: new Map<number, number>(),
			transactionsMap: new Map<number, number>(),
		};

		// 2. Clear all user's data
		await db.delete(table.transference).where(eq(table.transference.userId, userId));
		await db.delete(table.transaction).where(eq(table.transaction.userId, userId));
		await db.delete(table.category).where(eq(table.category.userId, userId));
		await db.delete(table.wallet).where(eq(table.wallet.userId, userId));

		// 3. Create wallets, and map the old ids with the new ids
		const walletsData = data.wallets.filter((w) => w.userId === BACKUP_USER_ID);
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
		const parentCategories = data.categories.filter(
			(c) => c.userId === BACKUP_USER_ID && c.parentId === null,
		);
		const newParentCategories = await db
			.insert(table.category)
			.values(
				parentCategories.map((c) => {
					return {
						userId,
						name: c.title,
						icon: c.iconName,
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
		const childCategories = data.categories.filter(
			(c) => c.userId === BACKUP_USER_ID && c.parentId !== null,
		);
		const newChildCategories = await db
			.insert(table.category)
			.values(
				childCategories.map((c) => {
					return {
						userId,
						name: c.title,
						icon: c.iconName,
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
		const getDateFromTimestamp = (timestamp: string) => {
			return timestamp.substring(0, timestamp.indexOf("T"));
		};

		const transactionsData = data.transactions.filter((t) => t.userId === BACKUP_USER_ID);
		const newTransactions = await db
			.insert(table.transaction)
			.values(
				transactionsData.map((t) => ({
					userId,
					isTransference: t.isTransference,
					type: t.type,
					description: t.description,
					createdAt: new Date(t.createdAt),
					updatedAt: new Date(t.updatedAt),
					cents: t.cents,
					date: getDateFromTimestamp(t.timestamp),
					categoryId: maps.categoriesMap.get(t.categoryId)!,
					walletId: maps.walletsMap.get(t.walletId)!,
				})),
			)
			.returning({ id: table.transaction.id });
		for (let i = 0; i < transactionsData.length; i++) {
			maps.transactionsMap.set(transactionsData[i].id, newTransactions[i].id);
		}

		// 6. Create all transferences
		const transferenceTransactions = transactionsData.filter((t) => t.isTransference);
		const transferenceTransactionsIdsSet = new Set(
			transferenceTransactions.map((t) => t.id),
		);
		const transferencesData = data.transferences.filter(
			(t) =>
				transferenceTransactionsIdsSet.has(t.transactionInId) ||
				transferenceTransactionsIdsSet.has(t.transactionOutId),
		);
		const newTransferences = await db
			.insert(table.transference)
			.values(
				transferencesData.map((t) => ({
					userId,
					transactionInId: maps.transactionsMap.get(t.transactionInId)!,
					transactionOutId: maps.transactionsMap.get(t.transactionOutId)!,
				})),
			)
			.returning({ id: table.transference.id });

		return json(
			{
				data: {
					wallets: { old: walletsData.length, new: newWallets.length },
					categories: {
						parent: { old: parentCategories.length, new: newParentCategories.length },
						child: { old: childCategories.length, new: newChildCategories.length },
					},
					transactions: { old: transactionsData.length, new: newTransactions.length },
					transferences: { old: transferencesData.length, new: newTransferences.length },
				},
			},
			{ status: 201 },
		);
	} catch (err) {
		console.log(err);
		return error(500, "Failed to read the backup file");
	}
}
