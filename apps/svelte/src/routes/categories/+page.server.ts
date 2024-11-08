import { deleteCategory, getNestedCategories } from "$lib/server/data/category";
import { fail, redirect } from "@sveltejs/kit";
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
	"delete-category": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const searchParams = event.url.searchParams;
		const categoryId = z.coerce.number().int().min(1).parse(searchParams.get("id"));
		return deleteCategory({
			userId: user.id,
			categoryId,
		});
	},
};
