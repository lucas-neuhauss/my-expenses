# Design: Refine the Effect / TanStack DB Boundary

## Context

The codebase has converged on a server-client split:

- **Server** (`src/lib/server/**`, `src/lib/remote/**`): Effect-TS for control flow, typed errors, and OpenTelemetry. SvelteKit `form()` and `command()` remote functions for transport.
- **Client** (`src/lib/db-collectons/**`, components, routes): TanStack DB for local-first state and reactive queries. Zod schemas for runtime shape of collection rows. `fetch()` for initial hydration.

The split is healthy in principle. The implementation has accumulated five mismatches at the boundary that this change addresses.

## Goals / Non-Goals

**Goals:**

- Make optimistic UI the default for all writes (matches today's delete behavior)
- Make the data layer's typed errors survive a network round-trip without losing structure
- Make each entity shape a single source of truth that the database, the transport, and the collection all share
- Make the choice to use (or not use) Effect on the client an explicit, documented decision

**Non-Goals:**

- Replace TanStack DB with Effect-based reactive state, or vice versa
- Add new user-facing features that depend on this work
- Change authentication, authorization, or session handling
- Change the Drizzle ORM or the database schema
- Adopt a full DDD / hexagonal architecture refactor

## Decisions

### Decision 1 — Schema unification: Effect Schema is the canonical source

**Choice:** Each entity has one canonical schema defined with Effect's `S.Struct` in a new `src/lib/schemas/<entity>.ts` module. Everything else derives from it.

```
CANONICAL SCHEMA FLOWS
══════════════════════════════════════════════════════════

   src/lib/schemas/wallet.ts         ← S.Struct({...})  (one place)
        │
        ├─► S.toStandardSchemaV1()  ─► z.object()      ─► TanStack DB collection
        │                                              ─► sveltekit-superforms
        │
        ├─► Type<S.Struct<...>>     ─► Drizzle insert type
        │
        └─► Server validation in Effect.gen
                (no separate Zod call needed)
```

**Why not Zod as the canonical source:** The investment is in Effect. Effect Schema is a first-class citizen. The new Effect 4 `toStandardSchemaV1` interop means anything that wants Zod (`sveltekit-superforms`, TanStack DB) can get it for free. Drizzle's TS types can be hand-mapped to the Effect Struct (or generated from it via a tiny helper).

**Why not Drizzle as the canonical source:** Drizzle is a database mapper, not a runtime validator. It can't produce a Zod or Effect schema. Trying to invert the dependency would mean manually writing runtime validators — the duplication this change is meant to remove.

**Trade-off accepted:** there is a manual mapping from Effect Struct fields to Drizzle column declarations. This is the cost of having the database layer speak SQL natively. A type-level check (a small `AssertWalletSchemaMatchesDrizzle` type) catches drift at compile time.

### Decision 2 — Transport unification: one module per entity, query + command, no HTTP routes

**Choice:** Each `src/lib/remote/<entity>.remote.ts` exports both `get<Entities>()` (a SvelteKit `query()`) and the existing `upsert<entity>Action` / `delete<entity>Action` (commands). The collection's `queryFn` calls the `query()` function instead of fetching `/api/<entity>`. The `+server.ts` routes are **removed** once the read path is migrated and no external consumer is found.

```
BEFORE                                    AFTER
══════                                    ╝═══

Collection                                Collection
   queryFn: fetch("/api/wallets")            queryFn: getWallets()
        │                                        │
        ▼                                        ▼
  +server.ts route                          wallet.remote.ts
  (HTTP handler)                            (query() function)
        X                                          │
  (deleted — no other                        ▼
   consumers)                          shared data layer
                                        (server/data/wallet.ts)
```

**Why:** the collection doesn't need to know there are two transport layers. The remote module becomes the public interface; the data layer behind it is an implementation detail. Keeping a thin HTTP shim around the remote function would re-introduce the duplication this change exists to remove — a shim that drifts the moment someone changes a shape in only one place.

**Exception:** the backup endpoint (`api/create-backup`) is left alone — it's a binary download with a different concern (file response, not data CRUD).

**Verification before removal:** for each route, a one-shot `grep` across the codebase (and any documented external consumers) must show no remaining references. The grep result is recorded in the change log.

### Decision 3 — Error propagation: throw, don't return a union

**Choice:** The remote function returns the success value on success, and **throws** on failure. The thrown value is a SvelteKit `error(httpStatus, body)` where `body` is the original tagged error from the data layer. The client catches and switches on `body._tag`.

```ts
// server
const result = await Effect.runPromise(
  program().pipe(Effect.catchAll(e =>
    Effect.sync(() => { throw error(statusFor(e._tag), e); })
  ))
);
return result;
```

```ts
// client
try {
  await deleteWalletAction(id);
  // success
} catch (e) {
  if (isHttpError(e)) {
    switch (e.body._tag) {
      case "EntityNotFoundError": ...
      case "DeleteWalletError":   ...
    }
  }
}
```

```
BEFORE (string union return)         AFTER (throw HttpError)
═══════════════════════════          ═══════════════════════

{                                    throw error(404, {
  ok: false,                           _tag: "EntityNotFoundError",
  errorType: "SqlError"                entity: "wallet",
}                                        id: 42
                                     });
}
```

**Why throw instead of return:** SvelteKit's `command()` and `form()` are designed around throwing. The `error()` helper exists exactly for this. The `{ ok: true, data } | { ok: false, error }` shape works but is a layer the framework already provides. Throwing also keeps the success path's type clean — `T` instead of `T | RemoteError`.

**Why preserve the tagged shape as the body:** the alternative is to lose the structure and let the client see only the HTTP status. Keeping the tagged shape in the body means TypeScript can still drive the dispatch on the client, and the exhaustiveness check on `_tag` still fires when a new variant is added.

**Trade-off accepted:** the HTTP status is now a *signal* of the error class (404, 409, 500), and the tagged shape is the *content*. They have to stay in sync. The mapping is a small `statusFor(tag: string): number` helper colocated with the data layer's error types.

### Decision 4 — Optimistic writes: same shape for insert, update, and delete

**Choice:** Every collection handler applies a local write before awaiting the remote call, and rolls it back if the remote call throws.

```ts
onInsert: async ({ transaction }) => {
  const optimistic = transaction.mutations[0].modified;
  // transaction has already applied optimistic write
  try {
    await upsertWalletAction(optimistic);
    return { refetch: false };
  } catch (e) {
    // rollback the optimistic insert
    walletCollection.utils.writeDelete(optimistic.id);
    if (isHttpError(e)) {
      handleError(e.body);              // dispatch on e.body._tag
    } else {
      toast.error("Network error");
    }
    throw e;
  }
}
```

**Note on TanStack DB's transaction model:** the existing `onDelete` calls `writeDelete` manually, which works, but TanStack DB's optimistic transactions already apply writes before the handler runs. The handler's job is to commit or roll back. We use the manual `writeDelete`/`writeUpdate` pattern to keep the rollback symmetric.

### Decision 5 — Client-side Effect: a documented four-criterion rule

**Choice:** Effect is allowed on the client only when one of four criteria applies. The criteria are:

1. Pre-submission validation (catch errors locally)
2. Optimistic rollback composition (multi-write transactions that need coordinated revert)
3. Multi-step flow control (chain remote calls with success/failure gates)
4. Parallel fan-out / fan-in (concurrent remote calls, combined result)

A short document (`src/lib/client-effect.md`) records the rule and points to the entity where each criterion is (or is not) used.

**Why not a library-wide rule like "never use Effect on the client":** the criteria are real. Pre-validation alone is valuable enough to justify client-side Effect at the form layer.

**Why not the opposite rule, "always use Effect on the client":** the majority of client code is rendering and reactive state — TanStack DB is better at that. Effect is overhead with no payoff.

## Risks / Trade-offs

### Risk: Effect Schema → Zod interop has rough edges

The `S.toStandardSchemaV1` interop is relatively new. If the resulting Zod schema doesn't behave the way `sveltekit-superforms` expects (e.g. default values, refinements), we may need a thin adapter.

**Mitigation:** start the schema unification work with wallet only. Validate that the resulting Zod schema works for both the collection and superforms before rolling out to the other three entities.

### Risk: Optimistic writes mask server errors

If a rollback is silent (the user doesn't see the toast), the UI lies: it shows a wallet that doesn't actually exist. The existing `onDelete` already has this risk.

**Mitigation:** the `handleError` step in every handler is non-negotiable — it must always show a toast that names the failure. The `client-side-effect` spec's first scenario documents this.

### Risk: SvelteKit `query()` invalidation semantics differ from `queryFn`

`query()` integrates with TanStack Query and gets cache invalidation for free. `queryFn` in the collection has its own refetch mechanism. The two may not stay in sync.

**Mitigation:** read invalidation is the same call — both go through the remote function. The collection's `utils.refetch()` is still the explicit invalidation API for after-mutation refreshes. The unified module is the only call site.

### Risk: Removing `+server.ts` routes breaks an unknown consumer

We don't currently know of any external consumers of the API routes. If we miss one, it breaks silently.

**Mitigation:** for each route, do a one-shot search of the codebase and any external references (e.g. `grep -r "api/wallets"` outside `src/lib/db-collectons`) before removing. Document the search result in the change log.

## Open Questions

1. **Effect Schema vs. Zod 4 for the canonical source:** this design picks Effect Schema. If the team prefers Zod 4 (because superforms and TanStack DB consume it directly), the design flips. The decision lives here, not in the spec, so it's easy to change.
2. **Should the `ok: true/false` discriminator be replaced with throwing on the failure path?** SvelteKit's `command()` and `form()` can throw, and the client can catch. This is closer to Effect's `Exit` model but loses the explicit shape. Current pick: keep the explicit shape.
3. **Transaction handling for compound operations:** "delete wallet, also delete linked transactions" is currently a single remote call. If the optimistic UI does a `writeBatch` to remove the wallet AND its transactions optimistically, the rollback is more complex. The current design keeps the remote function as the single source of truth and lets the collection's `onDelete` handle only the wallet-level write. The transactions get re-fetched via `refetch()` on the transactions collection.

## Spikes Worth Running

- **Spike: Effect Schema → Zod interop for one entity.** Time-box: 1 hour. If the interop works cleanly, schema unification is a go. If it doesn't, we pick Zod as the canonical source and lose the Effect Schema story.
- **Spike: TanStack DB's built-in optimistic transaction model.** The current `onDelete` uses manual `writeDelete`. TanStack DB may have a cleaner pattern. Time-box: 30 minutes, in a scratch file.
