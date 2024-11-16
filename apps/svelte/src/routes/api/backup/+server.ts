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

	try {
		const filePath = resolve("/home/neuhaus/Desktop", "expenses-2024-11-03_10_08.json");

		// Read the backup json
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
		};

		// Clear all user's data
		await db.delete(table.transference).where(eq(table.transference.userId, userId));
		await db.delete(table.transaction).where(eq(table.transaction.userId, userId));
		await db.delete(table.category).where(eq(table.category.userId, userId));
		await db.delete(table.wallet).where(eq(table.wallet.userId, userId));

		// Create wallets, and map the old ids with the new ids
		const newWallets = await db
			.insert(table.wallet)
			.values(
				data.wallets.map((w) => {
					return {
						userId,
						name: w.name,
						initialBalance: w.initialBalance,
					};
				}),
			)
			.returning({ id: table.wallet.id });
		for (let i = 0; i < data.wallets.length; i++) {
			maps.walletsMap.set(data.wallets[i].id, newWallets[i].id);
		}

		// Create categories, and map the old ids with the new ids
		// First we need to create the parent categories
		const parentCategories = data.categories.filter((c) => c.parentId === null);
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
		const childCategories = data.categories.filter((c) => c.parentId !== null);
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

		// TODO: Map through transferences. First create the transference transactions, and then the transference

		// TODO: Create all the transactions that are not included in a transference

		return json({ data }, { status: 201 });
	} catch (err) {
		return error(500, "Failed to read the backup file");
	}
}
