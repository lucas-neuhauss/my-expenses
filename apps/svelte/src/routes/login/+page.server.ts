import { fail, redirect } from "@sveltejs/kit";
import { verify } from "argon2";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { COOKIE_NAME, createSessionToken, getCookieOptions } from "$lib/server/auth";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(8).max(100),
});

export const load = async (event) => {
	if (event.locals.session) {
		return redirect(302, "/");
	}
	const url = new URL(event.request.url);
	return {
		registered: url.searchParams.get("registered") === "true",
	};
};

export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get("email");
		const password = formData.get("password");

		const parsed = loginSchema.safeParse({ email, password });
		if (!parsed.success) {
			return fail(400, { message: "Invalid email or password" });
		}

		const [user] = await db
			.select()
			.from(table.user)
			.where(eq(table.user.email, parsed.data.email.toLowerCase()))
			.limit(1);

		if (!user) {
			return fail(400, { message: "Incorrect email or password" });
		}

		try {
			const isValid = await verify(user.passwordHash, parsed.data.password);
			if (!isValid) {
				return fail(400, { message: "Incorrect email or password" });
			}
		} catch {
			return fail(400, { message: "Incorrect email or password" });
		}

		const token = await createSessionToken(user.id, user.email);
		cookies.set(COOKIE_NAME, token, getCookieOptions());

		redirect(303, "/");
	},
};
