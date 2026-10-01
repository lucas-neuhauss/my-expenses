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
 * The domain error registry: the single mapping from a tagged domain
 * error to the HTTP status it becomes.
 *
 * This is the only place that knows the status code for a domain error;
 * `runOrThrow` consults it. A tag that is absent (infrastructure errors
 * such as `DbError`) is not a domain error and becomes a 500.
 */
const DOMAIN_ERROR_STATUS: Record<string, number> = {
	EntityNotFoundError: 404,
	SubscriptionNotFoundError: 404,
	ForbiddenError: 403,
	InvalidBackupError: 400,
	// Per-entity "cannot delete" errors are 409 (conflict with current state).
	DeleteWalletError: 409,
	DeleteCategoryError: 409,
	DeleteTransactionError: 409,
};

/**
 * Look up the HTTP status for a tagged domain error, or `undefined` when
 * the tag is not a domain error.
 */
export function statusFor(tag: string): number | undefined {
	return DOMAIN_ERROR_STATUS[tag];
}
