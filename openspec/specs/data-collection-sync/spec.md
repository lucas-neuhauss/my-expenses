# Data Collection Sync

## Purpose

Define how client-side entity collections load and reconcile data through SvelteKit remote queries and optimistic mutations.

## Requirements

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

### Requirement: HTTP API routes are removed when no consumers remain

For each entity, the corresponding `+server.ts` route under `src/routes/api/<entity>/` MUST be removed once it has no external consumers. Internal reads (the only current consumers) MUST be migrated to the remote function first.

#### Scenario: `/api/wallets` has no external consumers
- **WHEN** the wallet read path is migrated to a `query()` remote function
- **THEN** the `+server.ts` route is deleted
