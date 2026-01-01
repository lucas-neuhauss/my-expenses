import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { error, json } from "@sveltejs/kit";
import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return error(401);
	}

	const getTransactionsData = Effect.fn("[GET] api/transactions")(function* (
		userId: UserId,
	) {
		return yield* exec(
			db
				.select({
					id: table.transaction.id,
					cents: table.transaction.cents,
					type: table.transaction.type,
					description: table.transaction.description,
					categoryId: table.transaction.categoryId,
					walletId: table.transaction.walletId,
					transferenceId: table.transaction.transferenceId,
					paid: table.transaction.paid,
					date: table.transaction.date,
				})
				.from(table.transaction)
				.where(and(eq(table.transaction.userId, userId)))
				.orderBy(desc(table.transaction.date), desc(table.transaction.id)),
		);
	});

	const transactions = await Effect.runPromise(getTransactionsData(locals.user.id));
	return json(transactions);
};
