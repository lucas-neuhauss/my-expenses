import { dev } from "$app/environment";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { error, json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import type { RequestHandler } from "./$types";

// Only allow in development/test environments
const isTestEnvironment = dev || process.env.NODE_ENV === "test" || process.env.E2E_TEST === "true";

interface SeedData {
	wallet?: { name: string; initialBalance?: number };
	category?: { name: string; type: "income" | "expense"; icon?: string };
	transaction?: {
		description: string;
		cents: number;
		type: "income" | "expense";
		walletId?: number;
		categoryId?: number;
		date?: string;
		paid?: boolean;
	};
}

interface CleanupData {
	walletId?: number;
	categoryId?: number;
	transactionId?: number;
	all?: boolean;
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!isTestEnvironment) {
		return error(403, "Test endpoint only available in development");
	}

	if (!locals.user) {
		return error(401);
	}

	const userId = locals.user.id as UserId;
	const body = (await request.json()) as SeedData;

	const seedData = Effect.fn("[POST] api/test/seed")(function* (data: SeedData) {
		const result: Record<string, unknown> = {};

		if (data.wallet) {
			const [wallet] = yield* exec(
				db
					.insert(table.wallet)
					.values({
						userId,
						name: data.wallet.name,
						initialBalance: data.wallet.initialBalance ?? 0,
					})
					.returning(),
			);
			result.wallet = wallet;
		}

		if (data.category) {
			const [category] = yield* exec(
				db
					.insert(table.category)
					.values({
						userId,
						name: data.category.name,
						type: data.category.type,
						icon: data.category.icon ?? "default.svg",
					})
					.returning(),
			);
			result.category = category;
		}

		if (data.transaction) {
			// Get first wallet and category if not provided
			let walletId = data.transaction.walletId;
			let categoryId = data.transaction.categoryId;

			if (!walletId) {
				const wallets = yield* exec(
					db.select().from(table.wallet).where(eq(table.wallet.userId, userId)).limit(1),
				);
				walletId = wallets[0]?.id;
			}

			if (!categoryId) {
				const categories = yield* exec(
					db
						.select()
						.from(table.category)
						.where(eq(table.category.userId, userId))
						.limit(1),
				);
				categoryId = categories[0]?.id;
			}

			if (!walletId || !categoryId) {
				throw new Error("Need at least one wallet and category to create transaction");
			}

			const [transaction] = yield* exec(
				db
					.insert(table.transaction)
					.values({
						userId,
						description: data.transaction.description,
						cents: data.transaction.cents,
						type: data.transaction.type,
						walletId,
						categoryId,
						date: data.transaction.date ?? new Date().toISOString().split("T")[0],
						paid: data.transaction.paid ?? true,
					})
					.returning(),
			);
			result.transaction = transaction;
		}

		return result;
	});

	const result = await Effect.runPromise(seedData(body));
	return json(result);
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!isTestEnvironment) {
		return error(403, "Test endpoint only available in development");
	}

	if (!locals.user) {
		return error(401);
	}

	const userId = locals.user.id as UserId;
	const body = (await request.json()) as CleanupData;

	const cleanup = Effect.fn("[DELETE] api/test/seed")(function* (data: CleanupData) {
		if (data.all) {
			// Delete all user data (order matters due to foreign keys)
			yield* exec(
				db.delete(table.transaction).where(eq(table.transaction.userId, userId)),
			);
			yield* exec(
				db.delete(table.subscription).where(eq(table.subscription.userId, userId)),
			);
			yield* exec(db.delete(table.category).where(eq(table.category.userId, userId)));
			yield* exec(db.delete(table.wallet).where(eq(table.wallet.userId, userId)));
			return { deleted: "all" };
		}

		if (data.transactionId) {
			yield* exec(
				db.delete(table.transaction).where(eq(table.transaction.id, data.transactionId)),
			);
		}

		if (data.categoryId) {
			yield* exec(
				db.delete(table.category).where(eq(table.category.id, data.categoryId)),
			);
		}

		if (data.walletId) {
			yield* exec(db.delete(table.wallet).where(eq(table.wallet.id, data.walletId)));
		}

		return { deleted: true };
	});

	const result = await Effect.runPromise(cleanup(body));
	return json(result);
};
