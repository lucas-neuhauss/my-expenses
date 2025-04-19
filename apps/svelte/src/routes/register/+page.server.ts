import { CATEGORY_SPECIAL } from "$lib/categories.js";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { validateEmail, validatePassword } from "$lib/utils/schema.js";
import { fail, redirect } from "@sveltejs/kit";

export const actions = {
	register: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get("email");
		const password = formData.get("password");

		if (!validateEmail(email)) {
			return fail(400, { message: "Invalid username" });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: "Invalid password" });
		}

		const { data, error } = await supabase.auth.signUp({ email, password });

		if (error || !data.user) {
			console.log(error);
			return fail(400, { message: "Something went wrong" });
		}
		const userId = data.user.id;

		await db.insert(table.category).values([
			{
				name: "House",
				userId,
				type: "expense",
				icon: "house.png",
			},
			{
				name: "Salary",
				userId,
				type: "income",
				icon: "dollar-coin.png",
			},
		]);

		await db.insert(table.wallet).values({
			userId,
			name: "Bank",
		});
		// Create unique categories for user
		await db.insert(table.category).values([
			{
				name: "_TRANSACTION-IN",
				type: "income",
				userId,
				unique: CATEGORY_SPECIAL.TRANSFERENCE_IN,
				icon: "bill.png",
			},
			{
				name: "_TRANSACTION-OUT",
				type: "expense",
				userId,
				unique: CATEGORY_SPECIAL.TRANSFERENCE_OUT,
				icon: "bill.png",
			},
		]);

		redirect(302, "/");
	},
};
