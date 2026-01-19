import { getSubscriptionsData } from "$lib/server/data/subscription";
import { NodeSdkLive } from "$lib/server/observability";
import { redirect } from "@sveltejs/kit";
import { Effect } from "effect";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, "/login");
	}

	const userId = locals.user.id;

	const program = Effect.fn("[load] subscriptions")(function* () {
		const subscriptions = yield* getSubscriptionsData({ userId });

		// Get categories for the form
		const categories = yield* exec(
			db
				.select({
					id: table.category.id,
					name: table.category.name,
					type: table.category.type,
					parentId: table.category.parentId,
					icon: table.category.icon,
					unique: table.category.unique,
				})
				.from(table.category)
				.where(and(eq(table.category.userId, userId), isNull(table.category.unique)))
				.orderBy(desc(table.category.parentId), table.category.name),
		);

		// Get wallets for the form
		const wallets = yield* exec(
			db
				.select({
					id: table.wallet.id,
					name: table.wallet.name,
				})
				.from(table.wallet)
				.where(eq(table.wallet.userId, userId))
				.orderBy(table.wallet.name),
		);

		return { subscriptions, categories, wallets };
	});

	return await Effect.runPromise(program().pipe(Effect.provide(NodeSdkLive)));
};
