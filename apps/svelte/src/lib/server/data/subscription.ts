import type { Subscription } from "$lib/schemas/subscription";
import { db, exec, userDataLock } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, eq, lte } from "drizzle-orm";
import { Data, Effect } from "effect";
import { requireOwnedReferences } from "./owned-references";
import { formatDateString, getDateWithDay, parseDate } from "./subscription-helpers";

/**
 * Tagged error for "subscription not found / not owned by user" conditions.
 * Yielded by `upsertSubscriptionData`, `deleteSubscriptionData`, and
 * `togglePauseSubscriptionData`; mapped to HTTP 404 by `statusFor`.
 */
export class SubscriptionNotFoundError extends Data.TaggedError(
	"SubscriptionNotFoundError",
)<{
	id: number;
}> {}

export type SubscriptionWithRelations = typeof table.subscription.$inferSelect & {
	category: { id: number; name: string; icon: string };
	wallet: { id: number; name: string };
};

export const getSubscriptionsData = Effect.fn("data/subscription/getSubscriptionsData")(
	function* ({ userId }: { userId: UserId }) {
		const subscriptions = yield* exec(
			db
				.select({
					id: table.subscription.id,
					name: table.subscription.name,
					cents: table.subscription.cents,
					userId: table.subscription.userId,
					categoryId: table.subscription.categoryId,
					walletId: table.subscription.walletId,
					dayOfMonth: table.subscription.dayOfMonth,
					paused: table.subscription.paused,
					startDate: table.subscription.startDate,
					endDate: table.subscription.endDate,
					lastGenerated: table.subscription.lastGenerated,
					category: {
						id: table.category.id,
						name: table.category.name,
						icon: table.category.icon,
					},
					wallet: {
						id: table.wallet.id,
						name: table.wallet.name,
					},
				})
				.from(table.subscription)
				.innerJoin(
					table.category,
					and(
						eq(table.subscription.categoryId, table.category.id),
						eq(table.category.userId, userId),
					),
				)
				.innerJoin(
					table.wallet,
					and(
						eq(table.subscription.walletId, table.wallet.id),
						eq(table.wallet.userId, userId),
					),
				)
				.where(eq(table.subscription.userId, userId))
				.orderBy(table.subscription.name),
		);

		return subscriptions as SubscriptionWithRelations[];
	},
);

export const upsertSubscriptionData = Effect.fn(
	"data/subscription/upsertSubscriptionData",
)(function* ({ userId, data }: { userId: UserId; data: Subscription }) {
	const { id, name, cents, categoryId, walletId, dayOfMonth, startDate, endDate } = data;
	yield* requireOwnedReferences({
		userId,
		walletIds: [walletId],
		categoryIds: [categoryId],
	});

	if (id === "new") {
		yield* exec(
			db.insert(table.subscription).values({
				name,
				cents,
				userId,
				categoryId,
				walletId,
				dayOfMonth,
				startDate,
				endDate,
				paused: false,
				lastGenerated: null,
			}),
		);
		return "Subscription created" as const;
	} else {
		// Verify ownership
		const [existing] = yield* exec(
			db
				.select({ id: table.subscription.id })
				.from(table.subscription)
				.where(and(eq(table.subscription.id, id), eq(table.subscription.userId, userId))),
		);

		if (!existing) {
			return yield* new SubscriptionNotFoundError({ id });
		}

		yield* exec(
			db
				.update(table.subscription)
				.set({
					name,
					cents,
					categoryId,
					walletId,
					dayOfMonth,
					startDate,
					endDate,
				})
				.where(eq(table.subscription.id, id)),
		);
		return "Subscription updated" as const;
	}
});

export const deleteSubscriptionData = Effect.fn(
	"data/subscription/deleteSubscriptionData",
)(function* ({ userId, subscriptionId }: { userId: UserId; subscriptionId: number }) {
	// Verify ownership
	const [existing] = yield* exec(
		db
			.select({ id: table.subscription.id })
			.from(table.subscription)
			.where(
				and(
					eq(table.subscription.id, subscriptionId),
					eq(table.subscription.userId, userId),
				),
			),
	);

	if (!existing) {
		return yield* new SubscriptionNotFoundError({ id: subscriptionId });
	}

	yield* exec(
		db.delete(table.subscription).where(eq(table.subscription.id, subscriptionId)),
	);
	return "Subscription deleted" as const;
});

export const togglePauseSubscriptionData = Effect.fn(
	"data/subscription/togglePauseSubscriptionData",
)(function* ({ userId, subscriptionId }: { userId: UserId; subscriptionId: number }) {
	// Verify ownership and get current state
	const [existing] = yield* exec(
		db
			.select({ id: table.subscription.id, paused: table.subscription.paused })
			.from(table.subscription)
			.where(
				and(
					eq(table.subscription.id, subscriptionId),
					eq(table.subscription.userId, userId),
				),
			),
	);

	if (!existing) {
		return yield* new SubscriptionNotFoundError({ id: subscriptionId });
	}

	yield* exec(
		db
			.update(table.subscription)
			.set({ paused: !existing.paused })
			.where(eq(table.subscription.id, subscriptionId)),
	);

	return existing.paused
		? ("Subscription resumed" as const)
		: ("Subscription paused" as const);
});

/**
 * Generate all pending transactions for a user's subscriptions.
 * This handles:
 * - Subscriptions that haven't generated their first transaction yet
 * - Subscriptions that are due for new transactions
 * - Day overflow for short months (31 → Feb 28, Apr 30, etc.)
 */
export const generatePendingTransactionsData = Effect.fn(
	"data/subscription/generatePendingTransactionsData",
)(function* ({ userId }: { userId: UserId }) {
	const today = new Date();
	const todayStr = formatDateString(today);

	return yield* exec(
		db.transaction(async (tx) => {
			// A cookie is a throttle, not a lock. Serialize across requests, tabs and instances.
			// Restore uses the same transaction-scoped lock to avoid generation against old IDs.
			await tx.execute(userDataLock(userId));
			const subscriptions = await tx
				.select()
				.from(table.subscription)
				.where(
					and(
						eq(table.subscription.userId, userId),
						eq(table.subscription.paused, false),
						lte(table.subscription.startDate, todayStr),
					),
				)
				.for("update");

			let generatedCount = 0;
			for (const sub of subscriptions) {
				const [category] = await tx
					.select({ type: table.category.type })
					.from(table.category)
					.where(
						and(eq(table.category.id, sub.categoryId), eq(table.category.userId, userId)),
					);
				const [wallet] = await tx
					.select({ id: table.wallet.id })
					.from(table.wallet)
					.where(and(eq(table.wallet.id, sub.walletId), eq(table.wallet.userId, userId)));
				// Never generate against foreign references left by older versions of the app.
				if (!category || !wallet) continue;

				let nextGenDate: Date;
				if (sub.lastGenerated === null) {
					const start = parseDate(sub.startDate);
					nextGenDate = getDateWithDay(
						start.getFullYear(),
						start.getMonth(),
						sub.dayOfMonth,
					);
					if (nextGenDate < start) {
						nextGenDate = getDateWithDay(
							start.getFullYear(),
							start.getMonth() + 1,
							sub.dayOfMonth,
						);
					}
				} else {
					const last = parseDate(sub.lastGenerated);
					nextGenDate = getDateWithDay(
						last.getFullYear(),
						last.getMonth() + 1,
						sub.dayOfMonth,
					);
				}

				// Include overdue occurrences even when the subscription has since ended.
				while (nextGenDate <= today) {
					const date = formatDateString(nextGenDate);
					if (sub.endDate && date > sub.endDate) break;
					const inserted = await tx
						.insert(table.transaction)
						.values({
							cents: category.type === "expense" ? -sub.cents : sub.cents,
							type: category.type,
							description: sub.name,
							userId,
							categoryId: sub.categoryId,
							walletId: sub.walletId,
							subscriptionId: sub.id,
							paid: true,
							date,
						})
						.onConflictDoNothing({
							target: [table.transaction.subscriptionId, table.transaction.date],
						})
						.returning({ id: table.transaction.id });

					// Commit the transaction and cursor together; failures roll both back.
					await tx
						.update(table.subscription)
						.set({ lastGenerated: date })
						.where(
							and(
								eq(table.subscription.id, sub.id),
								eq(table.subscription.userId, userId),
							),
						);
					generatedCount += inserted.length;
					nextGenDate = getDateWithDay(
						nextGenDate.getFullYear(),
						nextGenDate.getMonth() + 1,
						sub.dayOfMonth,
					);
				}
			}
			return generatedCount;
		}),
	);
});
