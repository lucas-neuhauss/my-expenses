import { CATEGORY_SPECIAL } from "$lib/categories.js";
import { hashPassword } from "$lib/server/auth/password";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { validateEmail, validatePassword } from "$lib/utils/schema.js";
import { fail, redirect } from "@sveltejs/kit";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get("email");
		const password = formData.get("password");

		if (!validateEmail(email)) {
			return fail(400, { message: "Invalid email" });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: "Invalid password" });
		}

		const emailStr = email as string;
		const passwordStr = password as string;

		// Check if user already exists
		const [existingUser] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.email, emailStr.toLowerCase()))
			.limit(1);

		if (existingUser) {
			return fail(400, { message: "User already exists" });
		}

		const userId = randomUUID();
		const passwordHash = await hashPassword(passwordStr);

		await db.insert(table.user).values({
			id: userId,
			email: emailStr.toLowerCase(),
			passwordHash,
		});

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

		redirect(302, "/login?registered=true");
	},
};
