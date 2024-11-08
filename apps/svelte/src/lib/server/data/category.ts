import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { NestedCategories } from "$lib/utils/category";
import { fail } from "@sveltejs/kit";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function getNestedCategories(
	userId: number,
	type: "income" | "expense" | null = null,
) {
	const categories = await db
		.select({
			id: table.category.id,
			name: table.category.name,
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
		.orderBy(desc(table.category.parentId), table.category.name);

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

export async function deleteCategory({
	userId,
	categoryId: id,
}: {
	userId: number;
	categoryId: number;
}) {
	const childCategories = alias(table.category, "childCategories");

	// Get the category to be deleted. Make sure to check if the `userId` matches
	const [category] = await db
		.select({
			id: table.category.id,
			name: table.category.name,
			type: table.category.type,
			childCategoryIds: sql<Array<number | null>>`array_agg(${childCategories.id})`,
		})
		.from(table.category)
		.leftJoin(childCategories, eq(childCategories.parentId, table.category.id))
		.where(and(eq(table.category.id, id), eq(table.category.userId, userId)))
		.groupBy(table.category.id);
	if (!category) {
		return fail(400, { ok: false, message: "Category not found" });
	}

	const childCategoryIds = category.childCategoryIds.filter(
		(i) => i !== null,
	) as number[];

	// Should not be able to delete the last category of a type
	const atLeastTwoArray = await db
		.select({ id: table.category.id })
		.from(table.category)
		.where(
			and(
				eq(table.category.userId, userId),
				eq(table.category.type, category.type),
				isNull(table.category.parentId),
				isNull(table.category.unique),
			),
		)
		.limit(2);
	if (atLeastTwoArray.length < 2) {
		return fail(400, {
			ok: false,
			message: `Cannot delete the last "${category.type === "income" ? "Income" : "Expense"}" categsory`,
		});
	}

	// Should not be able to delete a category with transactions
	const [categoryTransaction] = await db
		.select({ id: table.transaction.id })
		.from(table.transaction)
		.where(
			and(
				or(
					eq(table.transaction.categoryId, id),
					childCategoryIds.length === 0
						? undefined
						: inArray(table.transaction.categoryId, childCategoryIds),
				),
				eq(table.transaction.userId, userId),
			),
		)
		.limit(1);
	if (categoryTransaction) {
		return fail(400, {
			ok: false,
			message: "Category has one or more transactions, cannot be deleted",
		});
	}

	await db.delete(table.category).where(eq(table.category.id, id));
	return { ok: true };
}
