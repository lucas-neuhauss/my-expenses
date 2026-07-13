import type { Subscription } from "$lib/schemas/subscription";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { Data, Effect } from "effect";
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
				.innerJoin(table.category, eq(table.subscription.categoryId, table.category.id))
				.innerJoin(table.wallet, eq(table.subscription.walletId, table.wallet.id))
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

	// Get all active subscriptions that might need transaction generation
	const subscriptions = yield* exec(
		db
			.select()
			.from(table.subscription)
			.where(
				and(
					eq(table.subscription.userId, userId),
					eq(table.subscription.paused, false),
					// Start date must be <= today
					lte(table.subscription.startDate, todayStr),
					// End date is null or >= today (gte(endDate, todayStr) equivalent to lte(todayStr, endDate))
					or(
						isNull(table.subscription.endDate),
						gte(table.subscription.endDate, todayStr),
					),
				),
			),
	);

	let generatedCount = 0;

	for (const sub of subscriptions) {
		// Determine next generation date
		let nextGenDate: Date;

		if (sub.lastGenerated === null) {
			// First generation: use start date but adjust day to dayOfMonth
			const startDate = parseDate(sub.startDate);
			nextGenDate = getDateWithDay(
				startDate.getFullYear(),
				startDate.getMonth(),
				sub.dayOfMonth,
			);

			// If the adjusted date is before start date, move to next month
			if (nextGenDate < startDate) {
				nextGenDate = getDateWithDay(
					startDate.getFullYear(),
					startDate.getMonth() + 1,
					sub.dayOfMonth,
				);
			}
		} else {
			// Calculate next month from last generated
			const lastGen = parseDate(sub.lastGenerated);
			nextGenDate = getDateWithDay(
				lastGen.getFullYear(),
				lastGen.getMonth() + 1,
				sub.dayOfMonth,
			);
		}

		// Generate transactions for all due dates
		while (nextGenDate <= today) {
			const genDateStr = formatDateString(nextGenDate);

			// Check if end date is reached
			if (sub.endDate && genDateStr > sub.endDate) {
				break;
			}

			// Get category type to determine transaction type
			const [categoryResult] = yield* exec(
				db
					.select({ type: table.category.type })
					.from(table.category)
					.where(eq(table.category.id, sub.categoryId)),
			);

			if (!categoryResult) {
				break;
			}

			// Create the transaction
			yield* exec(
				db.insert(table.transaction).values({
					cents: categoryResult.type === "expense" ? -sub.cents : sub.cents,
					type: categoryResult.type,
					description: sub.name,
					userId,
					categoryId: sub.categoryId,
					walletId: sub.walletId,
					subscriptionId: sub.id,
					paid: true,
					date: genDateStr,
				}),
			);

			// Update lastGenerated
			yield* exec(
				db
					.update(table.subscription)
					.set({ lastGenerated: genDateStr })
					.where(eq(table.subscription.id, sub.id)),
			);

			generatedCount++;

			// Calculate next date
			nextGenDate = getDateWithDay(
				nextGenDate.getFullYear(),
				nextGenDate.getMonth() + 1,
				sub.dayOfMonth,
			);
		}
	}

	return generatedCount;
});
