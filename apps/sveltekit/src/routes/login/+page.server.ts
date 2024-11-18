import { dev } from "$app/environment";
import { CATEGORY_SPECIAL } from "$lib/categories";
import * as auth from "$lib/server/auth";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { validateEmail, validatePassword } from "$lib/utils/schema";
import { verify } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import { count, eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, "/");
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get("email");
		const password = formData.get("password");

		if (!validateEmail(email)) {
			return fail(400, { message: "Invalid email" });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: "Invalid password" });
		}

		const results = await db.select().from(table.user).where(eq(table.user.email, email));

		const user = results.at(0);
		if (!user) {
			return fail(400, { message: "Incorrect username or password" });
		}

		const validPassword = await verify(user.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1,
		});
		if (!validPassword) {
			return fail(400, { message: "Incorrect username or password" });
		}

		const session = await auth.createSession(user.id);
		event.cookies.set(auth.sessionCookieName, session.id, {
			path: "/",
			sameSite: "lax",
			httpOnly: true,
			expires: session.expiresAt,
			secure: !dev,
		});

		// Create one wallet for the user if there are none
		const walletCount = (
			await db
				.select({ count: count() })
				.from(table.wallet)
				.where(eq(table.wallet.userId, user.id))
		)[0].count;
		if (walletCount === 0) {
			await db.insert(table.wallet).values({
				userId: user.id,
				name: "Bank",
			});
		}

		// Create an income and an expense category for the user
		const categoryCount = (
			await db
				.select({ count: count() })
				.from(table.category)
				.where(eq(table.category.userId, user.id))
		)[0].count;
		if (categoryCount < 4) {
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
		}

		return redirect(302, "/");
	},
};
