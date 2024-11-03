import { getNestedCategories } from "$lib/server/data/category";
import { redirect } from "@sveltejs/kit";

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
