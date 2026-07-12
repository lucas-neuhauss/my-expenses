## Context

The current transaction view lives on the dashboard (`/`) and is optimized for per-month browsing with a fixed month/year selector, single-category filter, single-wallet filter, and paid-status filter. There is no free-text search, no custom date range, and no multi-category support. Users need a dedicated search page to find transactions across their entire history.

The existing dashboard uses TanStack DB (client-side collection queries) with Drizzle-style query builders and nuqs-svelte for URL search params. This same pattern will be reused for the search page.

## Goals / Non-Goals

**Goals:**
- A dedicated `/transactions` route (distinct from `/`) for searching/filtering transactions
- Free-text search by transaction description
- Custom date range filter (start date + end date pickers)
- Multi-category filter (select any number of categories via checkboxes)
- Wallet filter (single wallet, matching current pattern)
- Paid status filter (All / Paid / Not Paid)
- Sortable results table with the same columns as the dashboard
- Aggregate summary (total in, total out, net) for filtered results
- Link in the sidebar navigation to the new page
- All search state persisted in URL search params via nuqs-svelte

**Non-Goals:**
- Changing the dashboard (`/`) default behavior — it remains the per-month view
- Server-side pagination (client-side TanStack DB handles the data)
- CSV export or printing
- Bulk actions on search results
- Advanced filters like amount range, tags, or transaction type at this stage

## Decisions

1. **Dedicated route vs. overlay on dashboard** → **Dedicated `/transactions` route**
   - Rationale: Keeps the dashboard clean; the search page has different layout and UX needs (date range pickers, multi-select categories, larger results). URL is shareable/bookmarkable.

2. **Client-side query vs. server endpoint** → **Client-side TanStack DB (matching existing pattern)**
   - Rationale: The app already syncs transactions client-side via TanStack DB collections. Running the query on the client avoids additional server round-trips and keeps the architecture consistent. For large datasets, future pagination can be added.

3. **Multi-category UI** → **Popover with checkboxes (bit-ui + shadcn-svelte)**
   - Rationale: Categories are hierarchical (parent/child). A multi-select combobox with checkboxes matches the pattern of `CategoriesCombobox` but extended for multi-select. We'll build a new `multi-category-combobox.svelte` component.

4. **Date range picker** → **Two native date inputs (`<input type="date">`)**
   - Rationale: Keeps it simple. Native date inputs are well-supported, accessible, and don't require additional dependencies. The current dashboard uses month/year selectors; the search page uses a more flexible date range.

5. **Free-text search** → **Debounced text input filtering on description**
   - Rationale: Simple text match on the `description` field using TanStack DB's `like` or custom filter. Debounced (300ms) to avoid excessive filtering while typing.

6. **URL search params** → **nuqs-svelte (matching existing pattern)**
   - Rationale: Already used in the dashboard for month, year, wallet, category, and paid params. Extending to new params (search, dateFrom, dateTo, categories[]) keeps the codebase consistent and allows shareable/bookmarkable URLs.

## Risks / Trade-offs

- **[Large datasets] → Client-side filtering could be slow with thousands of transactions.** Mitigation: TanStack DB queries are indexed and efficient; if needed, we can add server-side filtering after launch.
- **[Multi-category URL params] → Storing an array of category IDs in URL params requires serialization.** Mitigation: nuqs supports array parsers via `parseAsArrayOf(parseAsInteger)`. The URL will contain `?categories=1&categories=2&categories=3`.
- **[Free-text search performance] → `like` queries on description are O(n) scans.** Mitigation: For typical personal finance datasets (thousands, not millions), this is fine. If needed, we can debounce more aggressively or add a full-text search index on the server.
- **[Two date inputs UX] → Date pickers are less polished than a calendar widget.** Mitigation: Acceptable trade-off for MVP simplicity. Future enhancement could use a date range picker component.
