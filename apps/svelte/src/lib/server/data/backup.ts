import { BackupSchema } from "$lib/schemas/backup";
import { db, exec, userDataLock } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { gzip } from "pako";
import { InvalidBackupError } from "./backup-file";

export const loadBackupData = Effect.fn("data/backup/loadBackupData")(function* ({
	userId,
	data,
}: {
	userId: UserId;
	data: unknown;
}) {
	// Validate the entire graph before executing even the first DELETE.
	const backup = yield* Effect.try({
		try: () => BackupSchema.parse(data),
		catch: () => new InvalidBackupError({ message: "Invalid backup data or references" }),
	});

	yield* exec(
		db.transaction(async (tx) => {
			await tx.execute(userDataLock(userId));
			const wallets = new Map<number, number>();
			const categories = new Map<number, number>();
			const subscriptions = new Map<number, number>();

			await tx.delete(table.transaction).where(eq(table.transaction.userId, userId));
			await tx.delete(table.subscription).where(eq(table.subscription.userId, userId));
			await tx.delete(table.category).where(eq(table.category.userId, userId));
			await tx.delete(table.wallet).where(eq(table.wallet.userId, userId));

			for (const row of backup.wallet) {
				const [created] = await tx
					.insert(table.wallet)
					.values({
						userId,
						name: row.name,
						initialBalance: row.initial_balance,
					})
					.returning({ id: table.wallet.id });
				wallets.set(row.id, created.id);
			}
			// The schema validates the app's parent/child hierarchy; parents must come first.
			const orderedCategories = [
				...backup.category.filter((row) => row.parent_id === null),
				...backup.category.filter((row) => row.parent_id !== null),
			];
			for (const row of orderedCategories) {
				const [created] = await tx
					.insert(table.category)
					.values({
						userId,
						name: row.name,
						icon: row.icon,
						type: row.type,
						unique: row.unique,
						parentId: row.parent_id === null ? null : categories.get(row.parent_id)!,
					})
					.returning({ id: table.category.id });
				categories.set(row.id, created.id);
			}
			for (const row of backup.subscription) {
				const [created] = await tx
					.insert(table.subscription)
					.values({
						userId,
						name: row.name,
						cents: row.cents,
						categoryId: categories.get(row.category_id)!,
						walletId: wallets.get(row.wallet_id)!,
						dayOfMonth: row.day_of_month,
						paused: row.paused,
						startDate: row.start_date,
						endDate: row.end_date,
						lastGenerated: row.last_generated,
					})
					.returning({ id: table.subscription.id });
				subscriptions.set(row.id, created.id);
			}
			// Bound query parameters for large backups and allow genuinely empty tables.
			for (let offset = 0; offset < backup.transaction.length; offset += 1000) {
				await tx.insert(table.transaction).values(
					backup.transaction.slice(offset, offset + 1000).map((row) => ({
						userId,
						cents: row.cents,
						type: row.type,
						description: row.description,
						date: row.date,
						paid: row.paid,
						createdAt: new Date(row.created_at),
						updatedAt: new Date(row.updated_at),
						categoryId: categories.get(row.category_id)!,
						walletId: wallets.get(row.wallet_id)!,
						subscriptionId:
							row.subscription_id === null
								? null
								: subscriptions.get(row.subscription_id)!,
						transferenceId: row.transference_id,
						installmentGroupId: row.installment_group_id,
						installmentIndex: row.installment_index,
						installmentTotal: row.installment_total,
					})),
				);
			}
		}),
	);
	return { ok: true, toast: "Backup restored" };
});

export const createBackupData = Effect.fn("data/backup/createBackupData")(function* ({
	userId,
}: {
	userId: UserId;
}) {
	const tables = {
		wallet: table.wallet,
		category: table.category,
		subscription: table.subscription,
		transaction: table.transaction,
	};
	// A consistent snapshot prevents broken references during concurrent writes.
	const data = yield* exec(
		db.transaction(
			async (tx) => {
				const data: Record<string, unknown> = { version: 1 };
				for (const [key, value] of Object.entries(tables)) {
					const rows = await tx.execute(
						sql`select * from ${value} where ${value.userId} = ${userId}`,
					);
					data[key] = rows.rows;
				}
				return data;
			},
			{ isolationLevel: "repeatable read", accessMode: "read only" },
		),
	);
	return Buffer.from(gzip(JSON.stringify(data))).toString("base64");
});
