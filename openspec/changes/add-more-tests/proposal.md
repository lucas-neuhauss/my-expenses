## Why

The project has adequate e2e coverage for core CRUD flows (wallets, categories, dashboard transactions) but almost no unit test coverage. There are only 3 unit test files (`demo.spec.ts`, `wallet.spec.ts`, `wallet-integration.spec.ts`), and they only cover the wallet schema spike. The server-side data layer, utility functions, and non-trivial business logic (subscription date math, transaction installments, chart calculations) have zero test coverage. This makes refactoring risky and makes it hard to validate edge cases in isolation.

Adding more tests will improve confidence when making changes, serve as living documentation for the data layer's behavior, and catch regressions early.

## What Changes

- Add **unit tests** for pure utility functions that have no database dependency:
  - `src/lib/utils/date-time.ts` – `getLocalDate` and `DateStringSchema`
  - `src/lib/utils/transaction.ts` – `calculateDashboardData` (complex aggregation logic)
  - `src/lib/utils/category.ts` – `nestCategories` (tree-building logic)
  - `src/lib/utils/form.ts` – `FormUtil.getErrorMessage` / `getSuccessMessage`
  - `src/lib/utils/color.ts` – `getRandomColor`
- Add **unit tests** for server-side data layer helpers that are pure or can be tested in isolation:
  - `src/lib/server/data/subscription.ts` – private helpers `splitEqually`, `addMonths`, `getDateWithDay`, `parseDate`, `formatDateString` (extract into testable utilities)
  - `src/lib/server/data/transaction.ts` – private helper `splitEqually`
- Add **e2e tests** for uncovered user flows:
  - Subscription CRUD (list, create, edit, delete, pause/resume)
  - Transaction with installments
  - Transference between wallets
  - Date range filtering / month navigation with transactions
- Add a **test utilities module** (`src/lib/test-utils/` or similar) with factories and helpers to make writing data-layer tests easier (e.g., mock context builders, schema factories)

## Capabilities

### New Capabilities
- `utility-unit-tests`: Unit tests for pure utility functions (`date-time`, `transaction`, `category`, `form`, `color`)
- `data-layer-unit-tests`: Unit tests for server-side data layer helpers and business logic (subscription date math, installment splitting, error handling)
- `subscription-e2e`: E2E tests for subscription CRUD and pause/resume flows
- `transaction-e2e`: E2E tests for installment transactions and transference flows
- `test-utilities`: Shared test factories and helpers to simplify test setup

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- `apps/svelte/` – new test files alongside existing source files
- `apps/svelte/src/lib/utils/` – some utility functions may need minor refactoring (e.g., extracting private helpers to exported functions) to make them testable
- `apps/svelte/src/lib/server/data/subscription.ts` – `splitEqually`, `addMonths`, `getDateWithDay`, `parseDate`, `formatDateString` should be extracted to a shared module or made exported for testing
- `apps/svelte/src/lib/server/data/transaction.ts` – `splitEqually` should be shared rather than duplicated
- No new dependencies; uses existing Vitest and Playwright setup
