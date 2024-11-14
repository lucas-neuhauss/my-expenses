import {
	deleteCategory,
	getNestedCategories,
	upsertCategory,
} from "$lib/server/data/category";
import { error, redirect } from "@sveltejs/kit";
import { z } from "zod";

export const load = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return redirect(302, "/login");
	}

	const nestedCategories = await getNestedCategories(user.id, "expense");
	return {
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
		console.log({
			1: searchParams.get("id"),
			2: categoryId,
		});
		return deleteCategory({
			userId: user.id,
			categoryId,
		});
	},
};
