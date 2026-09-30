import { statusFor } from "$lib/errors/db";
import { withTelemetry } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Cause, Effect, Exit, Option } from "effect";

/**
 * Run an Effect program and convert a failed *domain* error into a
 * thrown SvelteKit `error(status, body)` so the structured tagged error
 * survives the network round-trip.
 *
 * The status comes from the domain error registry (`statusFor`). A
 * tagged error that is not in the registry (for example the data layer's
 * `DbError`) is infrastructure: it is logged and surfaced as a 500 with
 * an `UnhandledError` body.
 *
 * This is the internal implementation detail behind the authenticated
 * remote seam (`src/lib/server/remote.ts`); remote functions do not call
 * it directly.
 *
 * On success: returns the Effect's success value.
 * On domain failure: throws `error(statusFor(_tag), e)`.
 * On infrastructure failure: throws `error(500, { _tag: "UnhandledError" })`.
 */
export async function runOrThrow<A, E extends { _tag: string }>(
	program: Effect.Effect<A, E>,
): Promise<A> {
	const exit = await Effect.runPromiseExit(withTelemetry(program));

	if (Exit.isSuccess(exit)) {
		return exit.value;
	}

	// Failure cause — extract a typed error if present.
	const failure = Cause.findErrorOption(exit.cause);
	if (Option.isSome(failure)) {
		// `Cause.findErrorOption` returns the cause's typed error. The
		// `as E` is a type-level narrowing (not a value cast): the helper
		// generic param `E` is the Effect's error channel and the cause's
		// error is known to be of that type.
		const e = failure.value as E;
		const status = statusFor(e._tag);
		if (status !== undefined) {
			throw error(status, e as App.Error);
		}
	}

	// Defect or non-domain tagged error: log and 500.
	await Effect.runPromise(
		Effect.logError("Unhandled remote-function error").pipe(
			Effect.annotateLogs("cause", exit.cause),
		),
	);
	throw error(500, {
		_tag: "UnhandledError",
		message: "An unexpected error occurred",
	});
}
