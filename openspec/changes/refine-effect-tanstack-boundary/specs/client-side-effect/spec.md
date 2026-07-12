## ADDED Requirements

### Requirement: Effect is used on the client only when a specific criterion is met

Effect-TS MAY be used in client-side code only when at least one of the following criteria applies. The criterion in use MUST be documented at the call site or in a per-file header comment.

1. **Pre-submission validation** — validating user input against the canonical schema before sending it to a remote function, to catch errors with no network round-trip
2. **Optimistic rollback composition** — coordinating multiple collection writes (insert + writeDelete on linked entities, or writeUpdate + writeInsert in a single transaction) so failures revert cleanly
3. **Multi-step flow control** — chaining several remote calls and/or local writes where the success/failure of each step gates the next
4. **Parallel fan-out / fan-in** — running multiple independent remote calls concurrently and combining their results

#### Scenario: A developer adds a remote function call from a component
- **WHEN** the component simply calls a remote function and renders its result
- **THEN** no Effect is used; the call goes through SvelteKit's remote function helper directly

#### Scenario: A developer composes a multi-step user flow
- **WHEN** the flow is "create subscription → generate first transaction → refresh transactions collection"
- **THEN** Effect is used, and a brief comment records the criterion ("multi-step flow control")

### Requirement: The criteria for client-side Effect use are documented in the repo

A short document — `src/lib/client-effect.md` — MUST exist, MUST list the four criteria above with a one-line example for each, and MUST point to the entity where each criterion is applied (or note "no current uses" with the reasoning).

#### Scenario: A new developer joins the project
- **WHEN** the developer wants to know whether to use Effect on the client
- **THEN** they can read `src/lib/client-effect.md`, see the criteria, find worked examples, and decide based on the same reasoning used elsewhere

### Requirement: Client-side Effect does not duplicate server-side validation

If a client uses Effect to validate input before submission, the schema it validates against MUST be the same canonical schema the server validates against. The validation MUST NOT be a hand-written duplicate of the server's schema.

#### Scenario: A form is pre-validated client-side
- **WHEN** the form's pre-submission check uses a schema
- **THEN** the schema is the canonical entity schema (possibly a subset for this form's input), not a re-typed copy of the server's input schema
