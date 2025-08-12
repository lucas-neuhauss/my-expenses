import { CATEGORY_ICON_LIST } from "$lib/categories";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import type { NestedCategory } from "$lib/utils/category";
import { fail } from "@sveltejs/kit";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { z } from "zod/v4";

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
			return fail(400, { ok: false, message: "Category not found" });
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
			return fail(400, {
				ok: false,
				message: `Cannot delete the last "${category.type === "income" ? "Income" : "Expense"}" categsory`,
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
			return fail(400, {
				ok: false,
				message: "Category has one or more transactions, cannot be deleted",
			});
		}

		yield* exec(db.delete(table.category).where(eq(table.category.id, id)));
		return { ok: true, toast: "Category deleted" };
	},
);

export const upsertCategoryData = Effect.fn("data/category/upsertCategoryData")(
	function* ({ userId, formData }: { userId: UserId; formData: FormData }) {
		const formObj = Object.fromEntries(formData.entries());
		const formSchema = z
			.looseObject({
				"category.id": z.coerce.number().int().or(z.literal("new")),
				"category.type": z.enum(["income", "expense"]),
				"category.name": z.string().min(1).max(255),
				"category.icon": z.enum(CATEGORY_ICON_LIST),
			})
			.transform((values) => {
				const childrenObj: Record<string, unknown> = {};
				for (const [key, value] of Object.entries(values)) {
					if (key.startsWith("category.")) continue;
					const firstDotIndex = key.indexOf(".");
					const secondDotIndex = key.indexOf(".", firstDotIndex + 1);
					const number = key.substring(firstDotIndex + 1, secondDotIndex);
					childrenObj[number] = {
						...(childrenObj[number] ? childrenObj[number] : {}),
						[key.substring(secondDotIndex + 1)]: value,
					};
				}
				return {
					id: values["category.id"],
					type: values["category.type"],
					name: values["category.name"],
					icon: values["category.icon"],
					children: Object.values(childrenObj),
				};
			})
			.pipe(
				z.object({
					id: z.int().positive().or(z.literal("new")),
					type: z.enum(["income", "expense"]),
					name: z.string().min(1).max(255),
					icon: z.enum(CATEGORY_ICON_LIST),
					children: z.array(
						z.object({
							id: z.coerce.number().int().positive().or(z.literal("new")),
							name: z.string().min(1).max(255),
							icon: z.enum(CATEGORY_ICON_LIST),
						}),
					),
				}),
			);
		const { id, name, type, icon, children } = formSchema.parse(formObj);

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
			if (children.length > 0) {
				yield* exec(
					db.insert(table.category).values(
						children.map((c) => ({
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
				return fail(403, { ok: false, message: "Forbidden" });
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
					const child = children.find((c) => c.id === res.id);

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
					return fail(400, {
						ok: false,
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
			for (const c of children) {
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

		return { ok: true, toast: id === "new" ? "Category created" : "Category updated" };
	},
);
