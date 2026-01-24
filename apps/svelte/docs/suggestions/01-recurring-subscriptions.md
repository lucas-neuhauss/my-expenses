# Suggestion 1: Recurring Transactions / Subscriptions

## Summary

Implement UI for the existing `subscription` database table to allow users to create recurring transactions that auto-generate on a schedule.

## Problem

Users have repeating expenses (Netflix, rent, salary) that require manual entry each month. The `subscription` table already exists in schema but has no UI.

## Proposed Solution

### Data Model (already exists)

```
subscription: id, name, cents, userId, categoryId, startDate, endDate, lastGenerated
```

### New UI Components

1. **Subscriptions Page** (`/subscriptions`)
   - List all active/past subscriptions
   - Create/Edit/Delete subscription dialog
   - Show next generation date
   - Toggle active/paused state

2. **Subscription Form**
   - Name, amount, category, wallet
   - Frequency: daily, weekly, monthly, yearly
   - Start date, optional end date
   - Day of month (for monthly)

3. **Auto-Generation Logic**
   - Server-side cron job OR
   - On-login check: generate pending transactions since `lastGenerated`
   - Update `lastGenerated` after each generation

### User Flow

1. User creates subscription: "Netflix - $15/month - Entertainment - starts Jan 1"
2. On Feb 1 (or next login after Feb 1), system creates transaction
3. Dashboard shows "Auto-generated" badge on subscription transactions
4. User can skip/modify individual generated transactions

## Technical Considerations

- Schema needs: `walletId`, `frequency`, `dayOfMonth` columns
- Consider Effect-TS scheduled task vs login-time generation
- Link generated transactions back to subscription via new FK

## Effort Estimate

- Schema migration: Add missing columns
- New route + components: 3-4 components
- Generation logic: server function + trigger mechanism
- Tests: unit + e2e

## Unresolved Questions

- Cron job (needs external scheduler) vs on-login generation (simpler but delayed)?
- Should subscriptions support installments?
- What happens when subscription generates while user is offline?
