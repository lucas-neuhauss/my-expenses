# my-expenses

A personal expense tracker: wallets hold money, transactions move it between
wallets and categories, and subscriptions generate transactions on a schedule.
The SvelteKit app lives in `apps/svelte`.

## Language

**Remote handler**:
The server-side function that performs one action for one entity, given the
authenticated user and the decoded input.
_Avoid_: endpoint, API route, controller

**Authenticated remote**:
The seam that resolves the session, runs a remote handler's Effect, and maps its
domain errors to HTTP errors. Remote functions and page loads cross it; each
chooses how an anonymous request fails (401, or a redirect to the login page).
_Avoid_: middleware, guard, wrapper

**Domain error**:
A tagged failure the data layer raises for a state the caller can act on
(missing row, forbidden, conflicting delete). Every domain error has one HTTP
status in the domain error registry; infrastructure failures are not domain
errors and become a 500.
_Avoid_: application error, business error
