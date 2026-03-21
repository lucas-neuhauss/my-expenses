import { redirect } from "@sveltejs/kit";

import { COOKIE_NAME, getCookieOptions } from "$lib/server/auth";

export const actions = {
	logout: async ({ cookies }) => {
		cookies.delete(COOKIE_NAME, getCookieOptions());
		redirect(303, "/login");
	},
};
