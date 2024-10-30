import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { NestedCategories } from "$lib/utils/category";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function getNestedCategories(
	userId: number,
	type: "income" | "expense" | null = null,
) {
	const categories = await db
		.select({
			id: table.category.id,
			title: table.category.title,
			type: table.category.type,
			parentId: table.category.parentId,
			iconName: table.category.iconName,
		})
		.from(table.category)
		.where(
			and(
				eq(table.category.userId, userId),
				isNull(table.category.unique),
				type ? eq(table.category.type, type) : undefined,
			),
		)
		.orderBy(desc(table.category.parentId), table.category.title);

	const nestedCategories = categories.reduce<NestedCategories>((acc, category) => {
		if (category.parentId === null) {
			acc.push({ ...category, children: [] });
		} else {
			const parent = acc.find((c) => c.id === category.parentId);
			if (parent) {
				parent.children.push(category);
			}
		}
		return acc;
	}, []);

	return nestedCategories;
}
