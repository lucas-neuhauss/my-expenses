import { EntityNotFoundError } from "$lib/errors/db";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

/** Reject foreign and missing references identically, without disclosing ownership. */
export const requireOwnedReferences = Effect.fn("data/requireOwnedReferences")(
	function* ({
		userId,
		walletIds,
		categoryIds = [],
	}: {
		userId: UserId;
		walletIds: number[];
		categoryIds?: number[];
	}) {
		if (walletIds.length > 0) {
			const wallets = yield* exec(
				db
					.select({ id: table.wallet.id })
					.from(table.wallet)
					.where(
						and(eq(table.wallet.userId, userId), inArray(table.wallet.id, walletIds)),
					),
			);
			const missingId = walletIds.find(
				(id) => !wallets.some((wallet) => wallet.id === id),
			);
			if (missingId !== undefined) {
				return yield* new EntityNotFoundError({ entity: "wallet", id: missingId });
			}
		}
		if (categoryIds.length > 0) {
			const categories = yield* exec(
				db
					.select({ id: table.category.id })
					.from(table.category)
					.where(
						and(
							eq(table.category.userId, userId),
							inArray(table.category.id, categoryIds),
						),
					),
			);
			const missingId = categoryIds.find(
				(id) => !categories.some((category) => category.id === id),
			);
			if (missingId !== undefined) {
				return yield* new EntityNotFoundError({ entity: "category", id: missingId });
			}
		}
	},
);
