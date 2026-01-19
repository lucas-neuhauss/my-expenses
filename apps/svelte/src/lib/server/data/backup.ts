import { db, exec } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { eq, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { Effect } from "effect";
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
	subscription?: {
		id: number;
		name: string;
		cents: number;
		user_id: string;
		category_id: number;
		wallet_id: number;
		day_of_month: number;
		paused: boolean;
		start_date: string;
		end_date: string | null;
		last_generated: string | null;
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
		paid: boolean;
		created_at: string;
		updated_at: string;
		installment_group_id: string | null;
		installment_index: number | null;
		installment_total: number | null;
		subscription_id: number | null;
	}[];
};

export const loadBackupData = Effect.fn("data/backup/loadBackupData")(function* ({
	userId,
	data,
}: {
	userId: UserId;
	data: BackupData;
}) {
	const maps = {
		walletsMap: new Map<number, number>(),
		categoriesMap: new Map<number, number>(),
		subscriptionsMap: new Map<number, number>(),
		transactionsMap: new Map<number, number>(),
	};

	// 1. Clear all user's data
	yield* exec(db.delete(table.transaction).where(eq(table.transaction.userId, userId)));
	yield* exec(db.delete(table.subscription).where(eq(table.subscription.userId, userId)));
	yield* exec(db.delete(table.category).where(eq(table.category.userId, userId)));
	yield* exec(db.delete(table.wallet).where(eq(table.wallet.userId, userId)));

	// 2. Create wallets, and map the old ids with the new ids
	const walletsData = data.wallet;
	const newWallets = yield* exec(
		db
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
			.returning({ id: table.wallet.id }),
	);
	for (let i = 0; i < walletsData.length; i++) {
		maps.walletsMap.set(walletsData[i].id, newWallets[i].id);
	}

	// 3. Create categories, and map the old ids with the new ids
	// First we need to create the parent categories
	const parentCategories = data.category.filter((c) => c.parent_id === null);
	const newParentCategories = yield* exec(
		db
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
			.returning({ id: table.category.id }),
	);
	for (let i = 0; i < parentCategories.length; i++) {
		maps.categoriesMap.set(parentCategories[i].id, newParentCategories[i].id);
	}

	// Then we can create the child categories
	const childCategories = data.category.filter((c) => c.parent_id !== null);
	if (childCategories.length > 0) {
		const newChildCategories = yield* exec(
			db
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
				.returning({ id: table.category.id }),
		);
		for (let i = 0; i < childCategories.length; i++) {
			maps.categoriesMap.set(childCategories[i].id, newChildCategories[i].id);
		}
	}

	// 4. Create subscriptions, and map the old ids with the new ids
	const subscriptionsData = data.subscription ?? [];
	if (subscriptionsData.length > 0) {
		const newSubscriptions = yield* exec(
			db
				.insert(table.subscription)
				.values(
					subscriptionsData.map((s) => ({
						userId,
						name: s.name,
						cents: s.cents,
						categoryId: maps.categoriesMap.get(s.category_id)!,
						walletId: maps.walletsMap.get(s.wallet_id)!,
						dayOfMonth: s.day_of_month,
						paused: s.paused,
						startDate: s.start_date,
						endDate: s.end_date,
						lastGenerated: s.last_generated,
					})),
				)
				.returning({ id: table.subscription.id }),
		);
		for (let i = 0; i < subscriptionsData.length; i++) {
			maps.subscriptionsMap.set(subscriptionsData[i].id, newSubscriptions[i].id);
		}
	}

	// 5. Create all the transactions, and map the old ids with the new ids
	const transactionsData = data.transaction;
	const newTransactions = yield* exec(
		db
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
					paid: t.paid,
					installmentGroupId: t.installment_group_id,
					installmentIndex: t.installment_index,
					installmentTotal: t.installment_total,
					subscriptionId: t.subscription_id
						? maps.subscriptionsMap.get(t.subscription_id)
						: null,
				})),
			)
			.returning({ id: table.transaction.id }),
	);
	for (let i = 0; i < transactionsData.length; i++) {
		maps.transactionsMap.set(transactionsData[i].id, newTransactions[i].id);
	}

	return { ok: true };
});

export const createBackupData = Effect.fn("data/backup/createBackupData")(function* ({
	userId,
}: {
	userId: UserId;
}) {
	const TABLES = ["wallet", "transaction", "category", "subscription"];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tables: any = {};

	for (const [key, value] of Object.entries(schema)) {
		if (value instanceof PgTable && TABLES.includes(key)) {
			yield* Effect.log(`Table: ${key}`);
			const rows = yield* exec(
				db.execute(sql.raw(`select * from ${key} where ${key}.user_id = '${userId}'`)),
			);
			tables[key] = Array.from(rows.rows);
		}
	}

	// Apply gzip compression
	const compressedData = gzip(JSON.stringify(tables), {});

	// Convert to base64 for safe storage
	return Buffer.from(compressedData).toString("base64");
});
