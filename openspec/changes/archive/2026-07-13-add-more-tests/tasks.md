# Tasks: Add More Tests

## 1. Test Utilities & Shared Helpers

- [x] 1.1 Create `src/lib/test-utils/factories.ts` with `buildWallet()`, `buildTransaction()`, `buildCategory()`, and `buildList()` factory functions using the canonical schemas
- [x] 1.2 Extract `splitEqually`, `addMonths`, `getDateWithDay`, `parseDate`, `formatDateString` from `src/lib/server/data/subscription.ts` into a new `src/lib/server/data/subscription-helpers.ts` module, re-exported from `subscription.ts`
- [x] 1.3 Replace the private `splitEqually` in `src/lib/server/data/transaction.ts` with an import from the new shared module

## 2. Utility Unit Tests

- [x] 2.1 Write unit tests for `src/lib/utils/date-time.ts`: `getLocalDate` with valid dates, invalid dates, and boundary values
- [x] 2.2 Write unit tests for `src/lib/utils/transaction.ts`: `calculateDashboardData` — income/expense aggregation, wallet filter, category filter, chart limiting (top 10 + "Others"), transfer exclusion
- [x] 2.3 Write unit tests for `src/lib/utils/category.ts`: `nestCategories` — parent-child tree building, orphans, flat lists
- [x] 2.4 Write unit tests for `src/lib/utils/form.ts`: `FormUtil.getErrorMessage` (string, Error object, null/unknown), `FormUtil.getSuccessMessage`
- [x] 2.5 Write unit tests for `src/lib/utils/color.ts`: `getRandomColor` returns a valid `<name>.<level>` string
- [x] 2.6 Write unit tests for `src/lib/errors/db.ts`: `statusFor` maps all known tags to correct HTTP codes and throws on unknown tags

## 3. Data Layer Helper Unit Tests

- [x] 3.1 Write unit tests for `src/lib/server/data/subscription-helpers.ts`: `splitEqually` (even split, remainder distribution, single part, zero cents)
- [x] 3.2 Write unit tests for `addMonths` (basic month addition, year overflow, short month clamping, non-leap February)
- [x] 3.3 Write unit tests for `getDateWithDay` (month overflow, day clamping)
- [x] 3.4 Write unit tests for `parseDate` (valid YYYY-MM-DD strings)
- [x] 3.5 Write unit tests for `formatDateString` (Date to YYYY-MM-DD format)

## 4. E2E Tests — Subscriptions

- [x] 4.1 Create `e2e/pages/subscriptions.page.ts` Page Object Model with selectors and actions for subscription CRUD
- [x] 4.2 Create `e2e/tests/subscriptions.test.ts` with tests: load page, create subscription, edit subscription, delete subscription
- [x] 4.3 Add tests for pause/resume toggle on subscriptions
- [x] 4.4 Ensure subscription tests clean up after themselves (delete created subscriptions)
- [x] 4.5 Update `e2e/utils/helpers.ts` if needed for subscription setup

## 5. E2E Tests — Transaction Extensions

- [x] 5.1 Extend `e2e/pages/transaction-dialog.page.ts` with installment and transference support
- [x] 5.2 Create `e2e/tests/transactions.test.ts` (or extend existing) with tests: create installment expense (verify multiple transactions appear)
- [x] 5.3 Add test for transference between two wallets (verify income/expense pair with matching transfer ID)
- [x] 5.4 Add test for transference validation error (same source and destination wallet)

## 6. Verification

- [x] 6.1 `pnpm check` — TypeScript compilation passes
- [x] 6.2 `pnpm test:unit -- --run` — all unit tests pass (new + existing)
- [x] 6.3 `pnpm test:e2e` — all Playwright tests pass (new + existing)
- [x] 6.4 `pnpm build` — production build succeeds
- [x] 6.5 `pnpm lint` — no new warnings
- [x] 6.6 `openspec validate add-more-tests` — proposal, specs, design, and tasks are consistent

## Ordering note

- **Group 1** (test utilities) should be done first — factories and extracted helpers are used by later groups
- **Groups 2–3** (unit tests) can be done in any order, but benefit from having factories available
- **Groups 4–5** (e2e tests) depend on group 1 for helpers but are otherwise independent of groups 2–3
- **Group 6** (verification) runs last
