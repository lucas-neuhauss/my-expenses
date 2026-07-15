# Schema Unification

## Purpose

Define canonical entity schemas and their alignment with database and client collection representations.

## Requirements

### Requirement: Each entity has exactly one schema definition

For each entity (wallet, category, subscription, transaction), there MUST be exactly one location that defines its shape. Every other consumer (Drizzle table, Zod input/output schema, Effect schema, client collection schema) MUST derive from that location — directly by reference, or indirectly through a documented derivation.

#### Scenario: A developer adds a new field to wallet
- **WHEN** the canonical wallet schema is updated to include a new field
- **THEN** the new field is automatically available to (or required by) the Drizzle insert/update path, the remote function's input schema, and the collection's row schema, with no further edits

#### Scenario: A developer removes a field
- **WHEN** a field is removed from the canonical schema
- **THEN** TypeScript flags the removal at every consumer site that still references the field

### Requirement: Drizzle column types are the database source of truth; the canonical schema aligns with them

The Drizzle table definition remains the source of truth for database column types. The canonical entity schema MUST be checked against it (manually or via a build-time check) to keep them aligned. Drift between the canonical schema and Drizzle is a build error.

#### Scenario: A Drizzle column changes type
- **WHEN** a Drizzle column's type changes (e.g. `text` to `varchar(50)`)
- **THEN** the canonical schema for that entity fails to derive cleanly, or fails a documented type-equivalence check

### Requirement: Client collection schemas derive from the canonical schema

The Zod schema used inside a TanStack DB collection's `queryCollectionOptions` MUST be either the canonical schema itself or a documented projection of it. The schema MUST NOT be hand-written to match the canonical schema's shape.

#### Scenario: A collection's row schema drifts
- **WHEN** a developer tries to hand-write a collection schema that does not match the canonical schema
- **THEN** TypeScript or a build-time check prevents the divergence (e.g. the collection rejects the schema, or a test fails)

### Requirement: The canonical schema lives in a single module

A single module — for example `src/lib/schemas/<entity>.ts` — MUST contain the canonical definition of each entity. Consumers MUST import from that module; the schema MUST NOT be redefined at the consumer site.

#### Scenario: A new entity is added
- **WHEN** a developer adds a new entity (e.g. "budget")
- **THEN** the canonical schema is added to `src/lib/schemas/budget.ts` and the data layer, remote functions, and collection import from it
