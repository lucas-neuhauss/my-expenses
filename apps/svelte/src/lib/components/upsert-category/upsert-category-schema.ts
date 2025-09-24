import { CATEGORY_ICON_LIST } from "$lib/categories";
import { NonNegativeIntFromString } from "$lib/schema";
import * as z from "zod";

export const UpsertCategorySchema = z.object({
	id: NonNegativeIntFromString.or(z.literal("new")),
	name: z.string().min(1).max(255),
	type: z.enum(["income", "expense"]),
	icon: z.enum(CATEGORY_ICON_LIST),
	subcategories: z
		.array(
			z.object({
				id: NonNegativeIntFromString.or(z.literal("new")),
				name: z.string().min(1).max(255),
				icon: z.enum(CATEGORY_ICON_LIST),
			}),
		)
		.optional()
		.transform((value) => value || []),
});

export type UpsertCategorySchema = z.infer<typeof UpsertCategorySchema>;
