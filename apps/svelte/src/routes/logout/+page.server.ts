import { redirect } from "@sveltejs/kit";

export const actions = {
	logout: async ({ locals: { supabase } }) => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error(error);
		}
		redirect(303, "/login");
	},
};
