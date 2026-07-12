import { EntityNotFoundError, ForbiddenError } from "$lib/errors/db";
import type { Category } from "$lib/schemas/category";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import type { NestedCategory } from "$lib/utils/category";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Data, Effect } from "effect";

/**
 * Tagged error for "cannot delete this category" conditions. Yielded by
 * `deleteCategoryData` and mapped to HTTP 409 by `statusFor`.
 */
export class DeleteCategoryError extends Data.TaggedError("DeleteCategoryError")<{
	message: string;
}> {}

export const getNestedCategoriesData = Effect.fn("data/category/getNestedCategoriesData")(
	function* (userId: UserId, type: "income" | "expense" | null = null) {
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
				.where(
					and(
						eq(table.category.userId, userId),
						isNull(table.category.unique),
						type ? eq(table.category.type, type) : undefined,
					),
				)
				.orderBy(desc(table.category.parentId), table.category.name),
		);

		const nestedCategories = categories.reduce<NestedCategory[]>((acc, category) => {
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
	},
);

export const deleteCategoryData = Effect.fn("data/category/deleteCategoryData")(
	function* ({ userId, categoryId: id }: { userId: UserId; categoryId: number }) {
		const tableChild = alias(table.category, "tableChild");

		// Get the category to be deleted. Make sure to check if the `userId` matches
		const [category] = yield* exec(
			db
				.select({
					id: table.category.id,
					name: table.category.name,
					type: table.category.type,
					childCategoryIds: sql<Array<number | null>>`array_agg(${tableChild.id})`,
				})
				.from(table.category)
				.leftJoin(tableChild, eq(tableChild.parentId, table.category.id))
				.where(and(eq(table.category.id, id), eq(table.category.userId, userId)))
				.groupBy(table.category.id),
		);
		if (!category) {
			return yield* new EntityNotFoundError({
				entity: "category",
				id,
				where: [`userId = ${userId}`],
			});
		}

		const childCategoryIds = category.childCategoryIds.filter(
			Number.isInteger,
		) as number[];

		// Should not be able to delete the last category of a type
		const atLeastTwoArray = yield* exec(
			db
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
				.limit(2),
		);
		if (atLeastTwoArray.length < 2) {
			return yield* new DeleteCategoryError({
				message: `Cannot delete the last "${category.type === "income" ? "Income" : "Expense"}" category`,
			});
		}

		// Should not be able to delete a category with transactions
		const [categoryTransaction] = yield* exec(
			db
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
				.limit(1),
		);
		if (categoryTransaction) {
			return yield* new DeleteCategoryError({
				message: "Category has one or more transactions, cannot be deleted",
			});
		}

		yield* exec(db.delete(table.category).where(eq(table.category.id, id)));
		return "Category deleted" as const;
	},
);

export const upsertCategoryData = Effect.fn("data/category/upsertCategoryData")(
	function* ({ userId, data }: { userId: UserId; data: Category }) {
		// `subcategories` is optional in the canonical schema's encoded
		// form, but the decode default fills it in. After the schema has
		// been applied (the form helper runs the validator before this
		// function), the value is always an array; the `?? []` is a
		// belt-and-braces fallback for direct callers.
		const { id, name, icon, type, subcategories: subcats } = data;
		const subcategories = subcats ?? [];

		if (id === "new") {
			// Create parent category
			const [parent] = yield* exec(
				db
					.insert(table.category)
					.values({
						name,
						userId,
						icon,
						type,
						parentId: null,
					})
					.returning({ id: table.category.id }),
			);

			// Create all subcategories
			if (subcategories.length > 0) {
				yield* exec(
					db.insert(table.category).values(
						subcategories.map((c) => ({
							name: c.name,
							userId,
							icon: c.icon,
							type,
							parentId: parent.id,
						})),
					),
				);
			}
		} else {
			const results = yield* exec(
				db
					.select()
					.from(table.category)
					.where(or(eq(table.category.id, id), eq(table.category.parentId, id))),
			);

			if (results.findIndex((res) => res.userId !== userId) !== -1) {
				return yield* new ForbiddenError();
			}

			const idsToDelete: number[] = [];
			// Update or delete existing categories
			for (const res of results) {
				if (res.id === id) {
					// Update parent category
					yield* exec(
						db
							.update(table.category)
							.set({ name, icon })
							.where(eq(table.category.id, id)),
					);
				} else {
					const child = subcategories.find((c) => c.id === res.id);

					if (child) {
						// Update a category
						yield* exec(
							db
								.update(table.category)
								.set({
									name: child.name,
									icon: child.icon,
								})
								.where(eq(table.category.id, res.id)),
						);
					} else {
						// Delete the category
						idsToDelete.push(res.id);
					}
				}
			}

			if (idsToDelete.length > 0) {
				// Make sure we are not deleting a subcategory with one or more transactions
				const [transaction] = yield* exec(
					db
						.select({ id: table.transaction.id })
						.from(table.transaction)
						.where(inArray(table.transaction.categoryId, idsToDelete))
						.limit(1),
				);
				if (transaction) {
					return yield* new DeleteCategoryError({
						message: `One of the deleted subcategories has one or more transactions, error updating`,
					});
				} else {
					// Delete the subcategories
					yield* exec(
						db.delete(table.category).where(inArray(table.category.id, idsToDelete)),
					);
				}
			}

			// Create new subcategories
			for (const c of subcategories) {
				if (c.id === "new") {
					yield* exec(
						db.insert(table.category).values({
							name: c.name,
							icon: c.icon,
							userId,
							type,
							parentId: id,
						}),
					);
				}
			}
		}

		return id === "new" ? ("Category created" as const) : ("Category updated" as const);
	},
);
