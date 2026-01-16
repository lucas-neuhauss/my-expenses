# Installments Feature

Installments allow splitting a single expense into multiple monthly payments, useful for credit card purchases that are paid over time.

## Database Schema

**Table:** `transaction` (`apps/svelte/src/lib/server/db/schema.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `installmentGroupId` | `text` | UUID linking all installments in a group |
| `installmentIndex` | `integer` | Position in sequence (1-indexed) |
| `installmentTotal` | `integer` | Total number of installments |

Index exists on `installmentGroupId` for efficient querying.

## Constraints

- **Only for new expenses** - cannot add installments when editing
- **2-24 installments** max
- **Monthly progression** - each installment is one month apart
- **Amounts must sum to total** - enforced on both client and server

## Amount Splitting Logic

**Location:** `apps/svelte/src/lib/server/data/transaction.ts`

```typescript
function splitEqually(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}
```

- Uses floor division
- Remainder cents go to first installments
- Sum always equals total (no rounding errors)

## Date Calculation

**Location:** `apps/svelte/src/lib/server/data/transaction.ts`

```typescript
function addMonths(dateStr: string, months: number): string
```

- Handles month/year overflow
- Clamps to last day of month (Jan 31 + 1mo = Feb 28/29)

## Creation Flow

1. User enables installments toggle in expense form
2. User sets count (2-24)
3. UI shows editable grid of individual amounts
4. On submit, server creates N separate transactions:
   - Same `installmentGroupId` (new UUID)
   - Incremented `installmentIndex` (1 to N)
   - Same `installmentTotal`
   - Dates: original, +1mo, +2mo, etc.
   - Amounts: split equally or custom

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/db/schema.ts` | DB schema with installment fields |
| `src/lib/server/data/transaction.ts` | Server logic: `upsertTransactionData`, `splitEqually`, `addMonths` |
| `src/lib/components/upsert-transaction/installments-input.svelte` | Toggle, count input, amount grid UI |
| `src/lib/components/upsert-transaction/upsert-transaction-form.svelte` | Form integration, read-only display for existing |
| `src/lib/db-collectons/transaction-collection.ts` | TanStack DB schema with installment fields |
| `src/routes/+page.svelte` | Display `[X/Y]` badge in transaction list |
| `src/routes/api/transactions/+server.ts` | API includes installment fields |
| `src/routes/lib.ts` | Query builder includes installment fields |

## UI Behavior

### Creating New Expense
- `InstallmentsInput` component shown
- Toggle to enable, count picker, editable amount grid
- Validation: shows "Missing: R$ X.XX" or "Excess: R$ X.XX" if amounts don't match

### Viewing Transaction List
- Badge `[2/6]` shown next to description for installment transactions

### Editing Existing Installment
- Read-only text: "Installment 2 of 6"
- Cannot modify installment structure (would require editing multiple transactions)

## Form Data

Hidden fields submitted when creating installments:

```html
<input name="installmentsEnabled" value="true" />
<input name="installmentsCount" value="6" />
<input name="installmentsCents" value="[1667,1667,1667,1667,1666,1666]" />
```

## Validation Schema

```typescript
installmentsEnabled: z.coerce.boolean()
installmentsCount: z.coerce.number().int().min(2).max(24)
installmentsCents: z.string() // JSON array, sum must equal total
```

## Example

R$ 100.00 expense split into 3 installments starting Jan 15:

| # | Date | Amount | installmentIndex | installmentTotal |
|---|------|--------|------------------|------------------|
| 1 | 2024-01-15 | R$ 33.34 | 1 | 3 |
| 2 | 2024-02-15 | R$ 33.33 | 2 | 3 |
| 3 | 2024-03-15 | R$ 33.33 | 3 | 3 |

All share same `installmentGroupId` UUID.

## Future Considerations

- Bulk delete of all installments in a group
- Bulk edit (change wallet/category for all)
- Filter/view by installment group
- Progress indicator (3 of 6 paid)
