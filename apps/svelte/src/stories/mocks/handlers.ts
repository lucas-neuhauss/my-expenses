import { delay, http, HttpResponse } from "msw";
import type { MockCategory } from "./category-data";

/**
 * Creates a handler for GET /api/categories
 */
export function categoriesHandler(data: MockCategory[]) {
	return http.get("/api/categories", async () => {
		await delay(100);
		return HttpResponse.json(data);
	});
}

/**
 * Creates a handler for POST /api/categories (create category)
 */
export function createCategoryHandler(onSuccess?: (category: MockCategory) => void) {
	return http.post("/api/categories", async ({ request }) => {
		await delay(100);
		const body = (await request.json()) as Partial<MockCategory>;
		const newCategory: MockCategory = {
			id: Date.now(),
			name: body.name ?? "New Category",
			type: body.type ?? "expense",
			parentId: body.parentId ?? null,
			icon: body.icon ?? "box.png",
			unique: null,
		};
		onSuccess?.(newCategory);
		return HttpResponse.json({ ok: true, category: newCategory });
	});
}

/**
 * Creates a handler for PUT /api/categories/:id (update category)
 */
export function updateCategoryHandler(
	onSuccess?: (id: number, data: Partial<MockCategory>) => void,
) {
	return http.put("/api/categories/:id", async ({ request, params }) => {
		await delay(100);
		const id = Number(params.id);
		const body = (await request.json()) as Partial<MockCategory>;
		onSuccess?.(id, body);
		return HttpResponse.json({ ok: true });
	});
}

/**
 * Creates a handler for DELETE /api/categories/:id
 */
export function deleteCategoryHandler(onSuccess?: (id: number) => void) {
	return http.delete("/api/categories/:id", async ({ params }) => {
		await delay(100);
		const id = Number(params.id);
		onSuccess?.(id);
		return HttpResponse.json({ ok: true, message: "Category deleted" });
	});
}

/**
 * Creates all CRUD handlers for categories
 */
export function allCategoryHandlers(data: MockCategory[]) {
	return [
		categoriesHandler(data),
		createCategoryHandler(),
		updateCategoryHandler(),
		deleteCategoryHandler(),
	];
}
