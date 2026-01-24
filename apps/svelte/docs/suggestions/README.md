# Feature Suggestions for My Expenses

Five proposed enhancements for the personal finance tracking application.

## Overview

| #   | Feature                                                    | Priority | Complexity | Leverage                  |
| --- | ---------------------------------------------------------- | -------- | ---------- | ------------------------- |
| 1   | [Recurring Subscriptions](./01-recurring-subscriptions.md) | High     | Medium     | Uses existing DB table    |
| 2   | [Budget Limits](./02-budget-limits.md)                     | High     | Medium     | Core finance feature      |
| 3   | [Financial Reports](./03-financial-reports.md)             | Medium   | Medium     | ECharts already in use    |
| 4   | [Transaction Search](./04-transaction-search.md)           | Medium   | Low        | Enhances existing filters |
| 5   | [CSV Export](./05-csv-export.md)                           | Low      | Low        | Quick win                 |

## Summary

### 1. Recurring Subscriptions

Auto-generate transactions for repeating expenses (rent, Netflix, salary). Schema exists, UI needed.

### 2. Budget Limits

Set spending limits per category. Visual progress bars, alerts when over budget.

### 3. Financial Reports

Visualize spending trends over time. Monthly comparisons, category trends, savings rate.

### 4. Transaction Search

Full-text search on descriptions, amount ranges, date ranges, multi-category filters.

### 5. CSV Export

Export transactions to spreadsheet format for external analysis or tax prep.

## Recommended Order

1. **CSV Export** - Lowest effort, immediate value
2. **Transaction Search** - Enhances daily usage, builds on existing filters
3. **Recurring Subscriptions** - High value, partially implemented
4. **Budget Limits** - Core budgeting feature
5. **Financial Reports** - Polish feature after core functionality complete
