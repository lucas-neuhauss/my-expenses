# Refine the Effect-TS / TanStack DB Boundary

## Why

The codebase has matured into two distinct paradigms:

- **Server side** — Effect-TS for typed errors, generator-based async flow, OpenTelemetry spans
- **Client side** — TanStack DB for local-first state, reactive queries, optimistic UI

Both are loved, both are here to stay. But the boundary between them has accumulated five friction points that cost us capability, code quality, and developer trust:

1. **Optimistic UI is half-built.** `onDelete` updates the collection immediately; `onInsert`/`onUpdate` wait for the server round-trip. The user feels the difference.
2. **Two transports for the same data.** Reads go through `+server.ts` HTTP routes. Writes go through SvelteKit `command()`/`form()` remote functions. The collection can't tell that the read shape and write shape are the same entity.
3. **Errors get flattened at the boundary.** Typed `Data.TaggedError`s (e.g. `EntityNotFoundError`, `DeleteWalletError`) are caught on the server, converted to `{ success: false, errorType: "..." }` strings, sent over the wire, then re-matched on the client by string. The whole point of Effect's error story is lost.
4. **Schema is defined three times per entity.** Drizzle, Zod (server), Zod (client). Drift risk is real, and the cost of drift is runtime errors TypeScript can't catch.
5. **Effect is server-only by convention.** This is fine — but the convention has no written justification, and the few places it might help on the client (pre-validation, multi-step optimistic flows) are not yet called out.

This change addresses all five. It is architectural, not feature work: better same-code, no new user-visible capabilities.

## What Changes

- All four entity collections get optimistic insert and update handlers matching the existing delete pattern
- All reads move from `/api/*` HTTP routes to SvelteKit `query()` remote functions, co-located with their write counterparts
- Errors cross the network boundary as structured, tagged objects — string matching is replaced with tag-based dispatch
- Entity schemas become single-source-of-truth. A new shared module defines each entity once; Drizzle types, Zod validators, and Effect schemas derive from it
- A short document records the criteria for using Effect on the client vs. leaving that work to TanStack DB
- HTTP API routes under `src/routes/api/<entity>/` are removed once they have no consumers (the entity collection and any future external consumer will use the remote function instead)

## Capabilities

### New Capabilities

- `data-collection-sync`: how data flows between the server data layer and client collections — the transport, the optimistic semantics, the rollback contract
- `error-propagation`: how typed errors flow from the data layer, across the network boundary, to the UI as actionable signals
- `schema-unification`: each entity has exactly one schema definition; all consumers derive from it
- `client-side-effect`: the criteria that justify using Effect-TS on the client, with worked examples

### Modified Capabilities

None. No existing specs in `openspec/specs/`.

## Impact

- **Files touched:**
  - `src/lib/server/data/{wallet,transaction,category,subscription}.ts` — error exports, schema references
  - `src/lib/remote/{wallet,transaction,category,subscription}.remote.ts` — query functions added, error tags passed through
  - `src/lib/db-collectons/{wallet,transaction,category,subscription}-collection.ts` — optimistic write handlers, schema derivation
  - `src/routes/api/{wallets,transactions,categories,subscriptions}/+server.ts` — removed (verified no external consumers as part of task 3.3)
  - New: `src/lib/schemas/` — canonical entity schemas
  - New: `src/lib/client-effect.md` — guidance document

- **No new runtime dependencies.** All work uses libraries already in the project (Effect 4, SvelteKit 2 remote functions, TanStack DB 0.6, Zod 4).

- **Behavior change for users:** inserts and updates become visually instant. Error toasts may show different (more accurate) messages for some failure modes. No other user-visible changes.

- **Behavior change for developers:** the boundary between server and client becomes a typed contract, not a string protocol. New entities get the same patterns for free by following the canonical schema.

## Out of Scope

- Migrating TanStack DB collection configuration to use `useLiveQuery` with Effect — TanStack DB remains the client state authority
- Adding new features that depend on this work (e.g. subscriptions auto-generating transactions)
- Replacing Drizzle or Zod with Effect Schema as the canonical source — the design document evaluates this and recommends a path, but the choice is left open as a separate decision if the team disagrees
- Backend or database schema changes
- Authentication or authorization changes
