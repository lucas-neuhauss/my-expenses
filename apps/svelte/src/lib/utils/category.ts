import type { Category } from "$lib/server/db/schema";

export type NestedCategory = Omit<Category, "userId" | "unique"> & {
	children: Omit<Category, "userId" | "unique">[];
};

export function nestCategories(categories: Omit<Category, "userId">[]) {
	return categories.reduce<NestedCategory[]>((acc, category) => {
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
}
