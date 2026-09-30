import { getRequestEvent } from "$app/server";
import type { SessionUser } from "$lib/server/auth";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error, redirect } from "@sveltejs/kit";
import type { Effect } from "effect";

/**
 * The authenticated remote seam.
 *
 * Every remote handler (and every page load that needs the current user)
 * crosses this seam, so the anonymous policy — 401 for remote functions,
 * a redirect to `/login` for page loads — lives in one place, and a
 * handler body only ever sees a non-null `SessionUser`.
 *
 * The implementation reads `locals`; the adapters below decide how to
 * fail when there is no user. That is the seam: `requireUser` (401) and
 * `requirePageUser` (redirect) are the two real adapters over one
 * `locals` shape.
 */

/** The shape `locals.user` narrows to once a session is required. */
export type { SessionUser };

/**
 * Require an authenticated user for a remote function or API route.
 * Throws a 401 when there is none.
 */
export function requireUser(locals: App.Locals): SessionUser {
	const user = locals.user;
	if (!user) {
		throw error(401);
	}
	return user;
}

/**
 * Require an authenticated user for a page `load`. Redirects to `/login`
 * when there is none, so the browser lands on the login form instead of
 * an error page.
 */
export function requirePageUser(locals: App.Locals): SessionUser {
	const user = locals.user;
	if (!user) {
		throw redirect(302, "/login");
	}
	return user;
}

/**
 * Decode a remote command's id argument. Remote ids arrive as
 * `number | string | unknown`; a non-positive or non-numeric value is a
 * 400 rather than a database lookup with `NaN`.
 */
export function requireId(input: unknown, label: string): number {
	const id =
		typeof input === "number"
			? input
			: typeof input === "string"
				? parseInt(input, 10)
				: NaN;
	if (isNaN(id) || id <= 0) {
		throw error(400, {
			_tag: "InvalidInputError",
			message: `Invalid ${label} ID`,
		});
	}
	return id;
}

type Tagged = { _tag: string };

/**
 * Wrap a handler that does not take input (a query). The returned
 * function resolves the session, runs the handler's Effect, and maps its
 * domain errors — exactly what SvelteKit's `query()` expects.
 */
export function authenticated<A, E extends Tagged>(
	handler: (user: SessionUser) => Effect.Effect<A, E, never>,
): () => Promise<A>;
/**
 * Wrap a handler that takes decoded input (a command or form handler).
 * `input` is the schema-decoded value, or `unknown` for the
 * `command("unchecked", ...)` adapters that decode ids themselves.
 */
export function authenticated<I, A, E extends Tagged>(
	handler: (user: SessionUser, input: I) => Effect.Effect<A, E, never>,
): (input: I) => Promise<A>;
export function authenticated(
	handler: (user: SessionUser, input?: unknown) => Effect.Effect<unknown, Tagged, never>,
): (input?: unknown) => Promise<unknown> {
	return async (input?: unknown) => {
		const user = requireUser(getRequestEvent().locals);
		return runOrThrow(handler(user, input));
	};
}
