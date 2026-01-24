# Suggestion 5: Export to CSV/Excel

## Summary

Allow users to export their transactions to CSV or Excel format for use in spreadsheets, tax preparation, or external analysis.

## Problem

Current backup is gzip-compressed JSON meant for restore, not human-readable. Users wanting to analyze data in Excel or share with accountants have no option.

## Proposed Solution

### Export Options

1. **CSV Export**
   - Standard comma-separated format
   - Compatible with Excel, Google Sheets, Numbers
   - UTF-8 encoding with BOM for Excel compatibility

2. **Excel Export** (optional)
   - Native .xlsx format
   - Pre-formatted columns
   - Multiple sheets (transactions, categories, wallets)

### Export Scope

1. **Current View Export**
   - Export what's currently filtered on dashboard
   - Respects all active filters

2. **Full Export**
   - All transactions for selected date range
   - Or entire history

3. **Per-Wallet Export**
   - Export single wallet's transactions
   - Useful for bank reconciliation

### CSV Columns

```
Date, Description, Category, Parent Category, Wallet, Amount, Type, Paid, Installment
2024-01-15, "Groceries", "Food", "", "Main Account", -45.50, expense, true, ""
2024-01-20, "Laptop", "Electronics", "Shopping", "Credit Card", -333.33, expense, true, "1/3"
```

### UI Components

1. **Export Button**
   - Add to dashboard header (near filters)
   - Dropdown: "Export CSV" / "Export Excel"

2. **Export Dialog** (optional for advanced)
   - Date range selector
   - Column selection checkboxes
   - Include/exclude options

### Technical Implementation

```typescript
// Server endpoint
GET /api/export?format=csv&wallet=all&from=2024-01-01&to=2024-12-31

// Response headers
Content-Type: text/csv
Content-Disposition: attachment; filename="expenses-2024.csv"
```

## Technical Considerations

- Stream large exports (don't load all in memory)
- Handle special characters in descriptions (quotes, commas)
- Date format configuration (US vs ISO)?
- Currency formatting (locale-aware)
- Library: `papaparse` for CSV, `exceljs` for xlsx

## Effort Estimate

- API endpoint for export
- CSV generation logic
- UI: button + optional dialog
- Optional: Excel library integration

## Unresolved Questions

- Include installment details as separate columns or merged?
- Date format preference (configurable or fixed ISO)?
- Excel export worth the added dependency?
- Export categories/wallets as separate files or sheets?
