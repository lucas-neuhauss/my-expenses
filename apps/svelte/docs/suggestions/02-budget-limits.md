# Suggestion 2: Budget Limits per Category

## Summary

Allow users to set monthly spending limits per category and receive visual feedback when approaching or exceeding budgets.

## Problem

Users track expenses but lack visibility into whether they're overspending relative to goals. No budgeting guardrails exist.

## Proposed Solution

### Data Model (new table)

```sql
budget:
  - id (serial)
  - userId (FK)
  - categoryId (FK, nullable for "total budget")
  - walletId (FK, nullable for "all wallets")
  - limitCents (integer)
  - period (enum: "monthly" | "yearly")
  - createdAt, updatedAt
```

### UI Components

1. **Budget Management Page** (`/budgets`)
   - List all budgets with progress bars
   - Create/Edit/Delete budget
   - Quick view: spent vs limit this period

2. **Dashboard Integration**
   - Category cards show budget progress
   - Color coding: green (<80%), yellow (80-100%), red (>100%)
   - Optional alert badge when over budget

3. **Budget Progress Widget**
   - Donut chart showing overall budget consumption
   - Breakdown by category

### User Flow

1. User sets budget: "Food - $500/month"
2. Dashboard shows "Food: $320 / $500" with 64% progress bar
3. When reaching $400 (80%), bar turns yellow
4. When exceeding $500, bar turns red + optional toast notification

## Technical Considerations

- Budget calculation: sum transactions for period WHERE categoryId matches
- Handle parent categories (include children in budget?)
- Consider category-less "total spending" budget option
- Rollover unused budget? (probably not for MVP)

## Effort Estimate

- New schema + migration
- `/budgets` route: list + form components
- Dashboard integration: modify existing cards
- Calculation logic in data layer

## Unresolved Questions

- Include child category spending in parent budget?
- Support per-wallet budgets?
- Notification system (in-app only or email)?
- Carry forward unused budget to next month?
