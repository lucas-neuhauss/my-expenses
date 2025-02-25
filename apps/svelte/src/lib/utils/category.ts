import type { Category } from "$lib/server/db/schema";

export type NestedCategory = Omit<Category, "userId" | "unique"> & {
	children: Omit<Category, "userId" | "unique">[];
};
