import { fail, redirect } from "@sveltejs/kit";

export const load = async (event) => {
	if (event.locals.user) {
		return redirect(302, "/");
	}
	return {};
};

export const actions = {
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			return fail(400, { message: "Incorrect username or password" });
		} else {
			redirect(303, "/");
		}
	},
};
