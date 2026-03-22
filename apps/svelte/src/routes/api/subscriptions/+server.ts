import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { error, json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return error(401);
	}

	const getSubscriptionsData = Effect.fn("[GET] api/subscriptions")(function* (
		userId: UserId,
	) {
		return yield* exec(
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
	});

	const subscriptions = await Effect.runPromise(getSubscriptionsData(locals.user.id));
	return json(subscriptions);
};
