import { getRequestEvent } from "$app/server";
import { Effect } from "effect";

export class Auth extends Effect.Service<Auth>()("app/Auth", {
	sync: () => ({
		login: Effect.fn(
			function* (credentials: { email: string; password: string }) {
				const {
					locals: { supabase },
				} = getRequestEvent();

				const { error } = yield* Effect.tryPromise(() =>
					supabase.auth.signInWithPassword(credentials),
				);
				if (error) return { ok: false };
				return { ok: true };
			},
			Effect.catchAll(() => Effect.succeed({ ok: false })),
		),
	}),
}) {}

export const AuthTest = new Auth({
	login: Effect.fn(function* () {
		return yield* Effect.succeed({ ok: true });
	}),
});
