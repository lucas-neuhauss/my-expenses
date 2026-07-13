# Utility Unit Tests

## Purpose

Ensure that pure utility functions in `src/lib/utils/` are covered by unit tests, verifying normal cases, edge cases, and error conditions.

## Requirements

### Requirement: Utility functions have unit test coverage
The system SHALL have unit tests for all pure utility functions in `src/lib/utils/`, covering normal cases, edge cases, and error conditions.

#### Scenario: getLocalDate parses valid date strings
- **WHEN** `getLocalDate("2024-03-15")` is called
- **THEN** it returns a `Date` object representing March 15, 2024

#### Scenario: getLocalDate throws on invalid date strings
- **WHEN** `getLocalDate("not-a-date")` is called
- **THEN** it throws an `Error` with message "Invalid date string"

#### Scenario: getLocalDate handles month boundary
- **WHEN** `getLocalDate("2024-01-01")` is called
- **THEN** it returns a `Date` for January 1, 2024 (zero-indexed month = 0)

#### Scenario: calculateDashboardData aggregates income and expense correctly
- **WHEN** `calculateDashboardData` receives a list of income and expense transactions with no filters
- **THEN** it returns correct `totalIncome`, `totalExpense`, `filteredIncome`, `filteredExpense` values

#### Scenario: calculateDashboardData filters by wallet
- **WHEN** `calculateDashboardData` receives transactions and a `walletFilter` matching one wallet
- **THEN** only transactions from that wallet are included in filtered totals

#### Scenario: calculateDashboardData filters by category
- **WHEN** `calculateDashboardData` receives transactions and a `categoryFilter`
- **THEN** only transactions with that category (or its parent) are included in filtered totals

#### Scenario: calculateDashboardData limits pie chart to top 10 categories
- **WHEN** there are more than 10 expense categories with transactions
- **THEN** `expensePieChartData` has exactly 11 items (10 categories + "Others")

#### Scenario: calculateDashboardData excludes transfer transactions from charts
- **WHEN** a transaction has a non-null `transferenceId`
- **THEN** it is excluded from `expensePieChartData` and `incomePieChartData`

#### Scenario: nestCategories builds parent-child tree
- **WHEN** `nestCategories` receives a flat list of categories with `parentId` references
- **THEN** it returns a nested tree with children under their parents

#### Scenario: nestCategories handles categories with no parents
- **WHEN** `nestCategories` receives categories where some have `parentId = null`
- **THEN** those appear as top-level items with empty `children` arrays

#### Scenario: nestCategories ignores orphan categories
- **WHEN** `nestCategories` receives a category whose `parentId` does not match any top-level category
- **THEN** that category is omitted (not added to any parent's children)

#### Scenario: FormUtil.getErrorMessage extracts string errors
- **WHEN** `FormUtil.getErrorMessage("error text")` is called
- **THEN** it returns `{ type: "error", text: "error text" }`

#### Scenario: FormUtil.getErrorMessage extracts message from error object
- **WHEN** `FormUtil.getErrorMessage(new Error("something broke"))` is called
- **THEN** it returns `{ type: "error", text: "something broke" }`

#### Scenario: FormUtil.getErrorMessage falls back for unknown errors
- **WHEN** `FormUtil.getErrorMessage(null)` is called
- **THEN** it returns `{ type: "error", text: "Something went wrong" }`

#### Scenario: FormUtil.getSuccessMessage returns success shape
- **WHEN** `FormUtil.getSuccessMessage("Done!")` is called
- **THEN** it returns `{ type: "success", text: "Done!" }`

#### Scenario: getRandomColor returns a valid color string
- **WHEN** `getRandomColor()` is called
- **THEN** it returns a string matching `<name>.<level>` (e.g., `"blue.5"`)

#### Scenario: DateStringSchema accepts any string
- **WHEN** `DateStringSchema.parse("2024-13-01")` is called
- **THEN** it returns the input string without validation (note: the schema is a `z.string()` without refinement; this is the current behavior, not necessarily desired)
