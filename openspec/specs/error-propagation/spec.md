# Error Propagation

## Purpose

Define typed error propagation from Effect data functions through SvelteKit remote functions to client collection handlers.

## Requirements

### Requirement: Data layer errors are typed, exported, and documented

Every error that the server data layer can produce MUST be defined as an `Effect` `Data.TaggedError` subclass, MUST be exported from the entity's data module, and MUST carry a typed payload that includes enough structure for the client to act on (e.g. the entity name and id for `EntityNotFoundError`).

#### Scenario: A reader inspects the wallet data module
- **WHEN** a developer opens `src/lib/server/data/wallet.ts`
- **THEN** every error class the data functions can yield is exported and named after the failure it represents

#### Scenario: A new error type is added to a data function
- **WHEN** a new failure mode is added to a data function
- **THEN** a new `Data.TaggedError` is added, exported, and listed in any `catchTags` in the remote function that calls it

### Requirement: Errors cross the network boundary as thrown HttpError bodies

The remote function layer MUST convert a failed data-layer effect into a thrown SvelteKit `error(httpStatus, body)` where `body` is the original tagged error. The client MUST receive an `HttpError` whose `body` is the tagged error, preserving `_tag` and all structured payload. The remote function MUST NOT return error-shaped data — it MUST throw.

#### Scenario: `EntityNotFoundError` crosses the boundary
- **WHEN** the data layer yields `new EntityNotFoundError({ entity: "wallet", id: 42, where: [...] })`
- **THEN** the remote function throws `error(404, { _tag: "EntityNotFoundError", entity: "wallet", id: 42, where: [...] })` and the client catches an `HttpError` with that body

#### Scenario: `DeleteWalletError` crosses the boundary
- **WHEN** the data layer yields `new DeleteWalletError({ message: "Wallet has one or more transactions, cannot be deleted" })`
- **THEN** the remote function throws `error(409, { _tag: "DeleteWalletError", message: "..." })` and the client receives an `HttpError` with that body

#### Scenario: HTTP status maps from error tag
- **WHEN** a data function yields a tagged error
- **THEN** the remote function maps `_tag` to an HTTP status (e.g. `EntityNotFoundError` → 404, `*AlreadyExistsError` → 409, `*PermissionError` → 403, anything else → 500) and uses that status in the `error()` call

### Requirement: Client components dispatch on error tag, not on string

Collection handlers and any component that consumes a remote function's failure MUST switch on the thrown error's `body._tag` field. They MUST NOT pattern-match on string `errorType` properties, on `message` text, or on the discriminated-union `ok: false` shape.

#### Scenario: Collection `onDelete` handles an `EntityNotFoundError`
- **WHEN** a delete throws `error(404, { _tag: "EntityNotFoundError", ... })`
- **THEN** the handler's `catch` block branches on `isHttpError(e) && e.body._tag === "EntityNotFoundError"` and produces a user-facing message from the structured payload

#### Scenario: A new error tag is added
- **WHEN** a new tagged error type is introduced on the server
- **THEN** the TypeScript exhaustiveness check fails on the client until a `_tag` case is added (or an explicit `_` default is justified)

### Requirement: Errors include a stable `_tag` for serialization

The `_tag` field on a `Data.TaggedError` MUST be a stable, kebab-case-compatible string suitable for use as a serialization key. Adding or renaming tags is a breaking change for clients and MUST be called out in the change log.

#### Scenario: A new error type is added on the server
- **WHEN** a new `Data.TaggedError` with `_tag: "WalletAlreadyExistsError"` is introduced
- **THEN** the type is exported, the remote function's `catchTags` lists it, and the client is expected to handle the new tag in its switch (the TypeScript exhaustiveness check enforces this)

#### Scenario: An existing tag is renamed
- **WHEN** a developer renames `_tag: "DbError"` to `_tag: "DatabaseError"`
- **THEN** the change log for this rename is recorded, and any client switch statement that still matches the old tag is caught by TypeScript
