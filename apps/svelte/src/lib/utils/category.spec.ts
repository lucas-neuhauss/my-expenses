import type { Category } from "$lib/server/db/schema";
import { describe, expect, it } from "vitest";
import { nestCategories } from "./category";

type TestCategory = Omit<Category, "userId">;

function makeCategory(overrides: Partial<TestCategory>): TestCategory {
	return {
		id: overrides.id ?? 1,
		name: overrides.name ?? "Test",
		type: overrides.type ?? ("expense" as const),
		icon: overrides.icon ?? "default",
		parentId: overrides.parentId ?? null,
		unique: overrides.unique ?? null,
	};
}

describe("nestCategories", () => {
	it("builds a parent-child tree from flat categories", () => {
		const categories: TestCategory[] = [
			makeCategory({ id: 1, name: "Food", parentId: null }),
			makeCategory({ id: 2, name: "Groceries", parentId: 1 }),
			makeCategory({ id: 3, name: "Restaurants", parentId: 1 }),
		];

		const result = nestCategories(categories);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
		expect(result[0].name).toBe("Food");
		expect(result[0].children).toHaveLength(2);
		expect(result[0].children[0].id).toBe(2);
		expect(result[0].children[0].name).toBe("Groceries");
		expect(result[0].children[1].id).toBe(3);
		expect(result[0].children[1].name).toBe("Restaurants");
	});

	it("handles orphans (categories with missing parent) by omitting them", () => {
		const categories: TestCategory[] = [
			makeCategory({ id: 1, name: "Food", parentId: null }),
			makeCategory({ id: 2, name: "Orphan", parentId: 999 }),
		];

		const result = nestCategories(categories);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
	});

	it("handles categories with no parents (all top-level)", () => {
		const categories: TestCategory[] = [
			makeCategory({ id: 1, name: "Food", parentId: null }),
			makeCategory({ id: 2, name: "Transport", parentId: null }),
			makeCategory({ id: 3, name: "Salary", type: "income", parentId: null }),
		];

		const result = nestCategories(categories);

		expect(result).toHaveLength(3);
		expect(result[0].children).toEqual([]);
		expect(result[1].children).toEqual([]);
		expect(result[2].children).toEqual([]);
	});

	it("handles an empty list", () => {
		const result = nestCategories([]);
		expect(result).toEqual([]);
	});
});
