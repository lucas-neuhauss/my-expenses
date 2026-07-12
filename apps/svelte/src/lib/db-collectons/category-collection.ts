import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { deleteCategoryAction } from "$lib/remote/category.remote";
import { CategoryRowSchema } from "$lib/schemas/category";
import { getApiUrl } from "$lib/utils/fetch";
import { isHttpError } from "@sveltejs/kit";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/svelte-db";
import { toast } from "svelte-sonner";

/**
 * Surface a category-error toast by dispatching on the tagged error's
 * `_tag`. Any tag not in the table is treated as a generic failure; the
 * collection caller re-throws to roll back the optimistic write.
 */
function categoryErrorToast(e: unknown): void {
	if (!isHttpError(e)) {
		toast.error("Something went wrong. Please try again later.");
		return;
	}
	const body = e.body as { _tag?: string; message?: string; entity?: string } | undefined;
	switch (body?._tag) {
		case "EntityNotFoundError":
			toast.error(`${body.entity ?? "Category"} not found`);
			return;
		case "DeleteCategoryError":
			toast.error(body.message ?? "Category cannot be deleted");
			return;
		case "InvalidInputError":
			toast.error(body.message ?? "Invalid input");
			return;
		default:
			toast.error("Something went wrong. Please try again later.");
	}
}

export const categoryCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		// `CategoryRowSchema` is the documented read-side projection of the
		// canonical `Category` schema; see `src/lib/schemas/category.ts`.
		schema: CategoryRowSchema,
		queryKey: ["category"],
		queryFn: async () => {
			const res = await fetch(getApiUrl("/api/categories"));
			if (!res.ok) return [];
			const json = await res.json();
			return Array.isArray(json) ? json : [];
		},
		getKey: (item) => item.id,
		// Handle all CRUD operations
		onInsert: async () => {
			return { refetch: false };
		},
		onUpdate: async () => {
			return { refetch: false };
		},
		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0];
			try {
				const message = await deleteCategoryAction(original.id);
				toast.success(message);
				return { refetch: false };
			} catch (e) {
				categoryErrorToast(e);
				throw e;
			}
		},
	}),
);
