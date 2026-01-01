import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { error, json } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return error(401);
	}

	const getCategoriesData = Effect.fn("[GET] api/categories")(function* (
		userId: UserId,
		type: "income" | "expense" | null = null,
	) {
		const categories = yield* exec(
			db
				.select({
					id: table.category.id,
					name: table.category.name,
					type: table.category.type,
					parentId: table.category.parentId,
					icon: table.category.icon,
				})
				.from(table.category)
				.where(eq(table.category.userId, userId))
				.orderBy(desc(table.category.parentId), table.category.name),
		);

		return categories;
	});

	const categories = await Effect.runPromise(getCategoriesData(locals.user.id, null));
	return json(categories);
};
