import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}
	return { user: event.locals.user };
};

export const actions: Actions = {
	logout: async ({ locals: { supabase } }) => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error(error);
		}
		redirect(303, "/login");
	},
};
