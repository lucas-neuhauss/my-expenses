## ADDED Requirements

### Requirement: Entity reads use SvelteKit remote query functions

All client-side reads of an entity MUST go through a `query()` remote function exported from `src/lib/remote/<entity>.remote.ts`. Reads MUST NOT go through `fetch("/api/<entity>")` HTTP routes from inside collection `queryFn`s.

#### Scenario: A collection's initial hydration
- **WHEN** a `queryCollectionOptions` `queryFn` fetches the entity list
- **THEN** it calls the entity's `get<Entities>()` remote function instead of fetching a `+server.ts` route

#### Scenario: A page reads an entity collection
- **WHEN** a Svelte component reads an entity via `useLiveQuery`
- **THEN** the underlying data source is the same canonical remote function used by the collection's `queryFn`

### Requirement: Mutations update the local collection optimistically

A collection's `onInsert` and `onUpdate` handlers MUST apply a local write to the collection before awaiting the server response, and MUST return `{ refetch: false }` so the optimistic write is the source of truth until reconciliation.

#### Scenario: User creates a wallet
- **WHEN** the user submits a new wallet
- **THEN** the wallet appears in the collection (and in any `useLiveQuery` consumers) before the server response resolves

#### Scenario: User updates a category
- **WHEN** the user edits a category's name
- **THEN** the updated name is visible in any list bound to the collection before the server response resolves

#### Scenario: User deletes a wallet
- **WHEN** the user deletes a wallet
- **THEN** the wallet is removed from the collection before the server response resolves (matches the existing `onDelete` behavior)

### Requirement: Failed mutations roll back optimistic writes

If a mutation's server call fails or returns a non-success result, the collection handler MUST reverse the optimistic write it applied, restoring the collection to its prior state.

#### Scenario: Optimistic insert is rejected by the server
- **WHEN** the optimistic insert succeeds locally but the remote function returns an error
- **THEN** the locally inserted item is removed from the collection

#### Scenario: Optimistic update is rejected by the server
- **WHEN** the optimistic update applies locally but the remote function returns an error
- **THEN** the item's fields are restored to their pre-update values

#### Scenario: Optimistic delete is rejected by the server
- **WHEN** the optimistic delete applies locally but the remote function returns an error
- **THEN** the item is re-inserted into the collection with its pre-delete values

### Requirement: Remote write functions throw on failure with a tagged error body

Every write remote function (`command`, `form`) MUST either return the success value or throw a SvelteKit `error(status, body)` whose `body` is the original tagged error from the data layer. The function MUST NOT return a `{ ok: true/false, ... }` discriminated union.

#### Scenario: A successful wallet upsert
- **WHEN** the wallet upsert succeeds
- **THEN** the remote function returns the success value (e.g. the message string) directly

#### Scenario: A wallet delete with linked transactions
- **WHEN** the wallet delete fails because the wallet has transactions
- **THEN** the remote function throws `error(409, { _tag: "DeleteWalletError", message: "..." })`. The client receives an `HttpError` whose `body._tag` is `"DeleteWalletError"` and switches on it.

#### Scenario: A client catches a thrown error
- **WHEN** the client `try { await deleteWalletAction(id) } catch (e) { ... }`
- **THEN** the catch block dispatches on `isHttpError(e) && e.body._tag` (no string matchers, no `ok: false` checks)

### Requirement: HTTP API routes are removed when no consumers remain

For each entity, the corresponding `+server.ts` route under `src/routes/api/<entity>/` MUST be removed once it has no external consumers. Internal reads (the only current consumers) MUST be migrated to the remote function first.

#### Scenario: `/api/wallets` has no external consumers
- **WHEN** the wallet read path is migrated to a `query()` remote function
- **THEN** the `+server.ts` route is deleted
