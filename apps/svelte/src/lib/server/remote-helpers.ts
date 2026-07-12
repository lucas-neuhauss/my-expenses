import { statusFor } from "$lib/errors/db";
import { withTelemetry } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Cause, Effect, Exit, Option } from "effect";

/**
 * Run an Effect program whose failure channel is a tagged error, and
 * convert the failure into a thrown SvelteKit `error(status, body)` so
 * the structured tagged error survives the network round-trip.
 *
 * The handler map is the set of tagged errors the remote function knows
 * how to convert. Any other error (defect, or tagged error not in the
 * map) is logged and surfaced as a 500 with an `UnhandledError` body.
 *
 * Example:
 *
 *   const message = await runOrThrow(
 *     upsertWalletData({ userId, data }),
 *     { EntityNotFoundError: (e) => e },
 *   );
 *
 * On success: returns the Effect's success value.
 * On mapped failure: throws `error(statusFor(_tag), handler(e))`.
 * On unhandled: throws `error(500, { _tag: "UnhandledError", ... })`.
 */
export async function runOrThrow<A, E extends { _tag: string }>(
	program: Effect.Effect<A, E>,
	catchTags: { [K in E["_tag"]]?: (e: Extract<E, { _tag: K }>) => App.Error },
): Promise<A> {
	const exit = await Effect.runPromiseExit(withTelemetry(program));

	if (Exit.isSuccess(exit)) {
		return exit.value;
	}

	// Failure cause — extract a typed error if present.
	const failure = Cause.findErrorOption(exit.cause);
	if (Option.isSome(failure)) {
		// `Cause.findErrorOption` returns the cause's typed error. The
		// `as E` is a type-level narrowing (not a value cast): the
		// helper generic param `E` is the Effect's error channel and
		// the cause's error is known to be of that type.
		const e = failure.value as E;
		const tag = e._tag;
		// The handler map is keyed by tag with per-tag value types; the
		// lookup widens the index to a function accepting the union.
		// The runtime check (`if (handler)`) gates the call.
		const handler = catchTags[tag as E["_tag"]] as ((e: E) => App.Error) | undefined;
		if (handler) {
			throw error(statusFor(tag), handler(e));
		}
	}

	// Defect or unmapped tagged error: log and 500.
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
