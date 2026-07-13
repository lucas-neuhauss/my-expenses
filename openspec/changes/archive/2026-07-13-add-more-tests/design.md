## Context

The project currently has **3 unit test files** and **4 e2e test files** covering basic CRUD for wallets, categories, and dashboard transactions. Non-trivial business logic lives in:

- **Utility functions** in `src/lib/utils/` – pure functions with no dependencies (date parsing, chart calculations, category tree-building, form helpers, random color generation)
- **Data layer functions** in `src/lib/server/data/` – Effect-TS functions that orchestrate Drizzle queries. Several of them contain private helper functions (e.g., `splitEqually`, `addMonths`, `getDateWithDay`) that are pure and easily testable once extracted.
- **Subscription logic** in `src/lib/server/data/subscription.ts` – date-based recurring transaction generation with edge cases around month-end clamping and paused states.

The Vitest config (`vite.config.ts`) already includes `src/**/*.{test,spec}.{js,ts}` and works out of the box. No new dependencies are needed. The Playwright config is also ready.

## Goals / Non-Goals

**Goals:**
- Add unit tests for all pure utility functions in `src/lib/utils/` to achieve >80% line coverage on these files
- Extract private pure helpers from `src/lib/server/data/subscription.ts` and `transaction.ts` into shareable, exported functions and test them
- Add e2e tests for subscription CRUD (create, read, pause/resume, delete)
- Add e2e tests for installment transactions and transference flows
- Create a shared test-utilities module with factories to simplify writing data-layer tests
- All tests must pass in CI (via `pnpm test`)

**Non-Goals:**
- Integration tests that require a real database (data-layer functions with `exec()` calls remain untested for now – that's a future concern)
- Testing every Svelte component in isolation (Storybook already exists for that)
- Adding test coverage for backup/export functionality (that's a separate effort)
- Adding any new test frameworks or dependencies

## Decisions

### 1. Extract private helpers rather than duplicate them
- **Decision**: Extract `splitEqually`, `addMonths`, `getDateWithDay`, `parseDate`, `formatDateString` into a shared module (`src/lib/server/data/subscription-helpers.ts`) and re-export from both `subscription.ts` and `transaction.ts` (which already has its own copy of `splitEqually`).
- **Rationale**: Testing private functions requires either (a) extracting them, (b) using `vi.importActual` trickery, or (c) testing only through the public API (which requires a real DB). Extraction is the cleanest approach and eliminates code duplication.
- **Alternatives considered**: Testing through the public API with mocked DB – too complex for pure logic. Keeping private and using `accessPrivate` patterns – brittle and not idiomatic Vitest.

### 2. Test utility functions directly (no mocks needed)
- **Decision**: All utility functions in `src/lib/utils/` are pure – they take inputs and return outputs. Tests call them directly with representative inputs and edge cases.
- **Rationale**: No mocking needed. Keeps tests simple and fast.

### 3. Keep test files co-located with source files
- **Decision**: Place `*.spec.ts` files next to the source files they test (e.g., `src/lib/utils/date-time.spec.ts` next to `date-time.ts`).
- **Rationale**: Follows the existing convention (`src/lib/schemas/wallet.spec.ts`). Vitest config already includes `src/**/*.{test,spec}.ts`.

### 4. E2E tests follow the existing Page Object Model
- **Decision**: Subscription e2e tests will follow the same pattern as `wallets.test.ts` and `categories.test.ts` – a `SubscriptionsPage` POM in `e2e/pages/`, and tests in `e2e/tests/subscriptions.test.ts`. Transaction installments and transference tests extend the existing `TransactionDialog` POM.
- **Rationale**: Consistency with existing patterns. The existing POMs already provide a reusable foundation.

### 5. Test utilities module
- **Decision**: Create `src/lib/test-utils/factories.ts` with builder functions for common test data shapes (e.g., `buildWallet()`, `buildTransaction()`, `buildCategory()`) that reflect the canonical schemas.
- **Rationale**: Reduces boilerplate in tests. The factories will use `faker` or simple overrides patterns. No additional dependency needed – use plain functions with defaults.

## Risks / Trade-offs

- **Risk**: Extracting helpers from `subscription.ts` changes imports and could break `generatePendingTransactionsData`. → **Mitigation**: Keep the original function signatures identical; the extracted functions are re-exported/re-imported transparently.
- **Risk**: E2E tests for subscriptions require an existing subscription in the test data – the test account (`test@email.com` / `password`) may not have subscriptions. → **Mitigation**: E2E tests will create their own subscription via the UI, following the same setup pattern as the dashboard tests (`setupTestData`).
- **Risk**: Some utility functions may have implicit dependencies on module-level state. → **Mitigation**: Audit each utility function before writing tests; refactor if needed (unlikely given the current code).
- **Trade-off**: No DB integration tests means some data-layer paths (e.g., error states, edge cases in queries) are covered only by manual testing or e2e. This is acceptable because the complex business logic is now unit-tested at the helper level.
