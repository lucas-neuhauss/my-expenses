import { Data } from "effect";

/**
 * Tagged error representing "row not found" for an entity lookup. The data
 * layer yields this when an `id` doesn't match (or doesn't belong to the
 * current user). The remote function maps it to HTTP 404.
 */
export class EntityNotFoundError extends Data.TaggedError("EntityNotFoundError")<{
	entity: string;
	id: number;
	where?: string[];
}> {}

/**
 * Tagged error representing a permission failure (entity exists but the
 * current user can't act on it). The remote function maps it to HTTP 403.
 */
export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{}> {}

/**
 * Map a tagged error's `_tag` to an HTTP status code.
 *
 * Co-located with the data layer's error types so the mapping lives next
 * to the data layer's failure surface. Every new tagged error MUST have
 * an entry here, and a missing entry throws so the omission is loud.
 *
 * Used by the remote function to convert a `yield* new ...Error(...)` into
 * a SvelteKit `error(status, body)` so the structured error survives the
 * network round-trip.
 */
export function statusFor(tag: string): number {
	switch (tag) {
		case "EntityNotFoundError":
			return 404;
		case "ForbiddenError":
			return 403;
		// Per-entity "cannot delete" errors are 409 (conflict with current state).
		case "DeleteWalletError":
		case "DeleteCategoryError":
		case "DeleteSubscriptionError":
		case "DeleteTransactionError":
			return 409;
		default:
			throw new Error(`No HTTP status mapping for tagged error: ${tag}`);
	}
}
