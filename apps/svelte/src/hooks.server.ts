import { dev } from "$app/environment";
import { createServerClient } from "@supabase/ssr";
import { type Handle, redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { Effect } from "effect";

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";
import { generatePendingTransactionsData } from "$lib/server/data/subscription";
import { NodeSdkLive } from "$lib/server/observability";

const supabase: Handle = async ({ event, resolve }) => {
	/**
	 * Creates a Supabase client specific to this server request.
	 *
	 * The Supabase client gets the Auth token from the request cookies.
	 */
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				/**
				 * SvelteKit's cookies API requires `path` to be explicitly set in
				 * the cookie options. Setting `path` to `/` replicates previous/
				 * standard behavior.
				 */
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, {
							...options,
							path: "/",
							sameSite: dev ? "lax" : "strict",
							secure: !dev,
						});
					});
				},
			},
		},
	);

	/**
	 * Unlike `supabase.auth.getSession()`, which returns the session _without_
	 * validating the JWT, this function also calls `getUser()` to validate the
	 * JWT before returning the session.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error,
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			// JWT validation has failed
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase libraries use the `content-range` and `x-supabase-api-version`
			 * headers, so we need to tell SvelteKit to pass it through.
			 */
			return name === "content-range" || name === "x-supabase-api-version";
		},
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	if (!event.locals.session && event.url.pathname.startsWith("/private")) {
		redirect(303, "/auth");
	}

	if (event.locals.session && event.url.pathname === "/auth") {
		redirect(303, "/private");
	}

	return resolve(event);
};

const SUBSCRIPTION_GEN_COOKIE = "subscription_gen_ts";
const SUBSCRIPTION_GEN_INTERVAL = 60 * 60 * 1000; // 1 hour in ms

const subscriptionGeneration: Handle = async ({ event, resolve }) => {
	const user = event.locals.user;

	// Only run for authenticated users
	if (user) {
		const lastGenTs = event.cookies.get(SUBSCRIPTION_GEN_COOKIE);
		const now = Date.now();

		// Check if we need to run generation (not run in the last hour)
		if (!lastGenTs || now - parseInt(lastGenTs, 10) > SUBSCRIPTION_GEN_INTERVAL) {
			// Set the cookie first to prevent concurrent runs
			event.cookies.set(SUBSCRIPTION_GEN_COOKIE, String(now), {
				path: "/",
				httpOnly: true,
				sameSite: dev ? "lax" : "strict",
				secure: !dev,
				maxAge: 60 * 60 * 24, // 24 hours
			});

			// Run generation in background (fire and forget)
			const program = generatePendingTransactionsData({ userId: user.id });
			Effect.runPromise(program.pipe(Effect.provide(NodeSdkLive))).catch((err) => {
				console.error("Failed to generate subscription transactions:", err);
			});
		}
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard, subscriptionGeneration);
