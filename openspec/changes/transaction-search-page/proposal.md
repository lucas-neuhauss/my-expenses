## Why

The current dashboard is optimized for per-month browsing — it shows one month at a time with wallet, single-category, and paid-status filters. There is no way to search across all transactions freely: users cannot find a transaction by name/description, filter across custom date ranges, or select multiple categories at once. As the transaction history grows, finding specific transactions becomes increasingly difficult.

## What Changes

- **New `/transactions` route** — a dedicated transaction search & filter page independent from the monthly dashboard
- **Free-text search** — search by transaction description (text match)
- **Custom date range filter** — pick start and end dates (instead of fixed month/year)
- **Multi-category filter** — select any number of categories to include (checkboxes / multi-select)
- **Wallet filter** — filter by one or multiple wallets (carry over from current)
- **Paid status filter** — carry over from current
- **Result list/report** — table of matching transactions with sortable columns
- **Default page unchanged** — the existing `/` route stays as the per-month dashboard
- **Navigation** — add link to the new search page in the app navigation

## Capabilities

### New Capabilities
- `transaction-search`: Full-text search across transactions with custom date range, multi-category, wallet, and paid-status filters. Includes a sortable results table and aggregate summaries.

### Modified Capabilities

None — no existing specs to modify.

## Impact

- **New route:** `src/routes/transactions/` with `+page.svelte` and `+page.server.ts`
- **Shared query logic:** Extract/extend `buildTransactionsQuery` in `src/routes/lib.ts` to support free-text search, date range parameters, and multi-category filtering — or create a new dedicated query module
- **Navigation:** Update the app shell layout to add a link to the search page
- **No changes to:** Database schema, existing dashboard, wallet/category/subscription pages
