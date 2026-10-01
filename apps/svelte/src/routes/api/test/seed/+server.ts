import { dev } from "$app/environment";
import { CATEGORY_ICON_LIST, CATEGORY_SPECIAL } from "$lib/categories";
import { EntityNotFoundError } from "$lib/errors/db";
import { requireOwnedReferences } from "$lib/server/data/owned-references";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { requireUser } from "$lib/server/remote";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error, json } from "@sveltejs/kit";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import type { RequestHandler } from "./$types";

const id = z.number().int().positive().max(2147483647);
const cents = z.number().int().min(-2147483648).max(2147483647);
const SeedSchema = z
	.strictObject({
		wallet: z
			.strictObject({
				name: z.string().min(1).max(255),
				initialBalance: cents.optional(),
			})
			.optional(),
		category: z
			.strictObject({
				name: z.string().min(1).max(255),
				type: z.enum(["income", "expense"]),
				icon: z.enum(CATEGORY_ICON_LIST).optional(),
			})
			.optional(),
		transaction: z
			.strictObject({
				description: z.string(),
				cents,
				type: z.enum(["income", "expense"]),
				walletId: id.optional(),
				categoryId: id.optional(),
				date: z.iso.date().optional(),
				paid: z.boolean().optional(),
			})
			.optional(),
		ensureSpecialCategories: z.boolean().optional(),
	})
	.refine(
		(data) =>
			data.wallet || data.category || data.transaction || data.ensureSpecialCategories,
	);
const CleanupSchema = z
	.strictObject({
		walletId: id.optional(),
		categoryId: id.optional(),
		transactionId: id.optional(),
		all: z.boolean().optional(),
	})
	.refine((data) => data.all || data.walletId || data.categoryId || data.transactionId);
type SeedData = z.infer<typeof SeedSchema>;
type CleanupData = z.infer<typeof CleanupSchema>;

async function readInput<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
	try {
		return schema.parse(await request.json());
	} catch {
		return error(400, { _tag: "InvalidInputError", message: "Invalid test API input" });
	}
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!dev && !__E2E_TEST_API_ENABLED__) return error(404);
	const userId = requireUser(locals).id;
	const body = await readInput(request, SeedSchema);

	const seedData = Effect.fn("[POST] api/test/seed")(function* (data: SeedData) {
		// Validate explicit references before creating any rows in the same request.
		yield* requireOwnedReferences({
			userId,
			walletIds: data.transaction?.walletId ? [data.transaction.walletId] : [],
			categoryIds: data.transaction?.categoryId ? [data.transaction.categoryId] : [],
		});
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
						icon: data.category.icon ?? "house.png",
					})
					.returning(),
			);
			result.category = category;
		}

		if (data.ensureSpecialCategories) {
			const existing = yield* exec(
				db
					.select({ unique: table.category.unique })
					.from(table.category)
					.where(
						and(eq(table.category.userId, userId), isNotNull(table.category.unique)),
					),
			);
			const have = new Set(existing.map((c) => c.unique));
			const toCreate = [
				{
					name: "_TRANSACTION-IN",
					type: "income" as const,
					unique: CATEGORY_SPECIAL.TRANSFERENCE_IN,
					icon: "bill.png",
				},
				{
					name: "_TRANSACTION-OUT",
					type: "expense" as const,
					unique: CATEGORY_SPECIAL.TRANSFERENCE_OUT,
					icon: "bill.png",
				},
			].filter((c) => !have.has(c.unique));
			if (toCreate.length > 0) {
				yield* exec(
					db.insert(table.category).values(
						toCreate.map((c) => ({
							userId,
							name: c.name,
							type: c.type,
							unique: c.unique,
							icon: c.icon,
						})),
					),
				);
			}
			result.specialCategories = { ensured: toCreate.length };
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

	const result = await runOrThrow(seedData(body));
	return json(result);
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!dev && !__E2E_TEST_API_ENABLED__) return error(404);
	const userId = requireUser(locals).id;
	const body = await readInput(request, CleanupSchema);

	const cleanup = Effect.fn("[DELETE] api/test/seed")(function* (data: CleanupData) {
		if (data.all) {
			// Delete all user data (order matters due to foreign keys).
			// Preserve app-managed infrastructure categories (those with a
			// `unique` marker, e.g. the transference in/out categories created
			// at registration) — features like transference rely on them and
			// they are not user-created test data.
			yield* exec(
				db.delete(table.transaction).where(eq(table.transaction.userId, userId)),
			);
			yield* exec(
				db.delete(table.subscription).where(eq(table.subscription.userId, userId)),
			);
			yield* exec(
				db
					.delete(table.category)
					.where(and(eq(table.category.userId, userId), isNull(table.category.unique))),
			);
			yield* exec(db.delete(table.wallet).where(eq(table.wallet.userId, userId)));
			return { deleted: "all" };
		}

		yield* requireOwnedReferences({
			userId,
			walletIds: data.walletId ? [data.walletId] : [],
			categoryIds: data.categoryId ? [data.categoryId] : [],
		});
		if (data.transactionId) {
			const [transaction] = yield* exec(
				db
					.select({ id: table.transaction.id })
					.from(table.transaction)
					.where(
						and(
							eq(table.transaction.id, data.transactionId),
							eq(table.transaction.userId, userId),
						),
					),
			);
			if (!transaction)
				return yield* new EntityNotFoundError({
					entity: "transaction",
					id: data.transactionId,
				});
			yield* exec(
				db
					.delete(table.transaction)
					.where(
						and(
							eq(table.transaction.id, data.transactionId),
							eq(table.transaction.userId, userId),
						),
					),
			);
		}

		if (data.categoryId) {
			yield* exec(
				db
					.delete(table.category)
					.where(
						and(
							eq(table.category.id, data.categoryId),
							eq(table.category.userId, userId),
						),
					),
			);
		}

		if (data.walletId) {
			yield* exec(
				db
					.delete(table.wallet)
					.where(
						and(eq(table.wallet.id, data.walletId), eq(table.wallet.userId, userId)),
					),
			);
		}

		return { deleted: true };
	});

	const result = await runOrThrow(cleanup(body));
	return json(result);
};
