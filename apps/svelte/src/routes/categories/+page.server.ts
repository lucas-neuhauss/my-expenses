import {
	deleteCategory,
	getNestedCategories,
	upsertCategory,
} from "$lib/server/data/category";
import { error, redirect } from "@sveltejs/kit";
import { z } from "zod/v4";

export const load = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return redirect(302, "/login");
	}

	const type = z
		.enum(["expense", "income"])
		.catch("expense")
		.parse(event.url.searchParams.get("type"));
	const nestedCategories = await getNestedCategories(user.id, type);
	return {
		type,
		nestedCategories,
	};
};

export const actions = {
	"upsert-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const formData = await event.request.formData();
		return upsertCategory({ userId: user.id, formData });
	},
	"delete-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const searchParams = event.url.searchParams;
		const categoryId = z.coerce.number().int().min(1).parse(searchParams.get("id"));
		return deleteCategory({
			userId: user.id,
			categoryId,
		});
	},
};
