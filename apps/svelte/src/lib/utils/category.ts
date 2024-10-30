import type { Category } from "$lib/server/db/schema";

export type NestedCategories = Array<
	Omit<Category, "userId" | "unique"> & {
		children: Omit<Category, "userId" | "unique">[];
	}
>;
