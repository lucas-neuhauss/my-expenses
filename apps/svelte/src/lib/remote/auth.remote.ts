import { form } from "$app/server";
import { NodeSdkLive } from "$lib/server/observability";
import { Auth } from "$lib/services/auth";
import { redirect } from "@sveltejs/kit";
import { Effect } from "effect";
import * as z from "zod";

export const loginAction = form(
	z.object({
		email: z.email(),
		password: z.string().min(8).max(100),
	}),
	async (credentials) => {
		const program = Effect.fn("[remote] - login")(function* () {
			const auth = yield* Auth;
			return yield* auth.login(credentials);
		});

		const { ok } = await Effect.runPromise(
			program().pipe(Effect.provide(NodeSdkLive), Effect.provide(Auth.Default)),
		);

		if (!ok) {
			return { ok: false, message: "Incorrect username or password" };
		} else {
			redirect(303, "/");
		}
	},
);
