import { dev } from "$app/environment";
import { CATEGORY_SPECIAL } from "$lib/categories.js";
import * as auth from "$lib/server/auth";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { validateEmail, validatePassword } from "$lib/utils/schema.js";
import { hash } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";

export const actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get("email");
		const password = formData.get("password");

		if (!validateEmail(email)) {
			return fail(400, { message: "Invalid username" });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: "Invalid password" });
		}

		const passwordHash = await hash(password, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1,
		});

		try {
			const [user] = await db
				.insert(table.user)
				.values({ email, passwordHash })
				.returning({ id: table.user.id });

			if (!user) {
				throw Error();
			}

			await db.insert(table.category).values([
				{
					name: "House",
					userId: user.id,
					type: "expense",
					icon: "house.png",
				},
				{
					name: "Salary",
					userId: user.id,
					type: "income",
					icon: "dollar-coin.png",
				},
			]);

			await db.insert(table.wallet).values({
				userId: user.id,
				name: "Bank",
			});
			// Create unique categories for user
			await db.insert(table.category).values([
				{
					name: "_TRANSACTION-IN",
					type: "income",
					userId: user.id,
					unique: CATEGORY_SPECIAL.TRANSFERENCE_IN,
					icon: "bill.png",
				},
				{
					name: "_TRANSACTION-OUT",
					type: "expense",
					userId: user.id,
					unique: CATEGORY_SPECIAL.TRANSFERENCE_OUT,
					icon: "bill.png",
				},
			]);

			const session = await auth.createSession(user.id);
			event.cookies.set(auth.sessionCookieName, session.id, {
				path: "/",
				sameSite: "lax",
				httpOnly: true,
				expires: session.expiresAt,
				secure: !dev,
			});
		} catch {
			return fail(500, { message: "An error has occurred" });
		}
		return redirect(302, "/");
	},
};
