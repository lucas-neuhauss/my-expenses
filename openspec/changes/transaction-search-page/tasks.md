## 1. Route & Navigation Setup

- [x] 1.1 Create the `/transactions` route with `+page.svelte`, `+page.server.ts`, and basic auth check in the load function
- [x] 1.2 Add "Search" navigation item to the sidebar (`app-sidebar.svelte`) with a Search icon linking to `/transactions`
- [x] 1.3 Set up nuqs-svelte search param state for the new page: `search`, `dateFrom`, `dateTo`, `categories`, `wallet`, `paid`

## 2. Query Builder & Data Layer

- [x] 2.1 Create `src/routes/transactions/lib.ts` with a `buildSearchQuery` function that extends the existing query pattern to support: free-text search on description, custom date range (start/end), and multi-category selection
- [x] 2.2 Wire up the TanStack DB live queries in `+page.svelte` using the new query builder, fetching from the transaction, category, and wallet collections

## 3. Filter UI Components

- [x] 3.1 Build a text search input with 300ms debounce for free-text filtering by description
- [x] 3.2 Build date range filter inputs (start date + end date using `<input type="date">`)
- [x] 3.3 Build a multi-category combobox/popover component with checkboxes for selecting multiple categories (include parent-category nesting logic)
- [x] 3.4 Add wallet filter select (reuse pattern from dashboard, "All Wallets" option)
- [x] 3.5 Add paid status filter select (All / Paid / Not Paid)

## 4. Results & Summary Display

- [x] 4.1 Display aggregate summary cards: total income, total expense, net balance for filtered results
- [x] 4.2 Build the transaction results table with columns: Date, Description, Category, Wallet, Amount, Paid
- [x] 4.3 Handle empty state (no transactions match filters) with an illustration and message
- [x] 4.4 Handle loading state with skeleton components

## 5. Polish & Edge Cases

- [x] 5.1 Ensure all filter state is persisted in URL search params (shareable/bookmarkable URLs)
- [x] 5.2 Handle the case where the user has no transactions at all
- [x] 5.3 Verify responsive layout for mobile view
- [x] 5.4 Test with the test account credentials and existing data
