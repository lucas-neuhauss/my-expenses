import { dev } from "$app/environment";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { Effect } from "effect";

import { getSessionFromCookies } from "$lib/server/auth";
import { generatePendingTransactionsData } from "$lib/server/data/subscription";
import { NodeSdkLive } from "$lib/server/observability";

const sessionHook: Handle = async ({ event, resolve }) => {
	const session = await getSessionFromCookies(event.cookies);

	event.locals.getSession = async () => session;

	if (session?.user) {
		event.locals.session = session;
		event.locals.user = {
			id: session.user.id,
			email: session.user.email,
		};
	} else {
		event.locals.session = null;
		event.locals.user = null;
	}

	return resolve(event);
};

const authGuard: Handle = async ({ event, resolve }) => {
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

export const handle: Handle = sequence(sessionHook, authGuard, subscriptionGeneration);
