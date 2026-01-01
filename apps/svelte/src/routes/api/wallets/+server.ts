import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { error, json } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return error(401);
	}

	const getWalletsData = Effect.fn("[GET] api/wallets")(function* (userId: UserId) {
		return yield* exec(
			db
				.select({
					id: table.wallet.id,
					name: table.wallet.name,
					initialBalance: table.wallet.initialBalance,
				})
				.from(table.wallet)
				.where(and(eq(table.wallet.userId, userId))),
		);
	});

	const wallets = await Effect.runPromise(getWalletsData(locals.user.id));
	return json(wallets);
};
