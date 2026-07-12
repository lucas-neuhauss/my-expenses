## ADDED Requirements

### Requirement: Free-text search by description
The system SHALL allow users to filter transactions by entering free text that matches the transaction description. The search SHALL be case-insensitive and match any part of the description string. The system SHALL debounce the search input by 300ms before applying the filter.

#### Scenario: Search by description
- **WHEN** the user types "grocer" in the search input
- **THEN** the transaction list SHALL show only transactions whose description contains "grocer" (case-insensitive, e.g., "Groceries", "Supermarket groceries")

#### Scenario: Clear search
- **WHEN** the user clears the search input
- **THEN** the transaction list SHALL show all transactions matching the other active filters

### Requirement: Custom date range filter
The system SHALL allow users to filter transactions by a custom date range using start and end date pickers. Both start and end dates SHALL be optional. When only start date is set, the range is from start date to infinity. When only end date is set, the range is from earliest transaction to end date. When neither is set, all transactions are shown.

#### Scenario: Filter by date range
- **WHEN** the user sets start date to "2025-01-01" and end date to "2025-12-31"
- **THEN** the transaction list SHALL show only transactions with dates between January 1, 2025 and December 31, 2025 (inclusive)

#### Scenario: Filter by start date only
- **WHEN** the user sets start date to "2025-06-01" and leaves end date empty
- **THEN** the transaction list SHALL show only transactions with dates on or after June 1, 2025

#### Scenario: Date range cleared
- **WHEN** the user clears both date fields
- **THEN** the transaction list SHALL show all transactions matching the other active filters

### Requirement: Multi-category filter
The system SHALL allow users to select any number of categories to filter transactions by. When a parent category is selected, all its child categories SHALL be included in the filter. The categories SHALL be presented in a popover with checkboxes.

#### Scenario: Filter by single category
- **WHEN** the user selects the "Food" category
- **THEN** only transactions with category "Food" or any of its children SHALL be shown

#### Scenario: Filter by multiple categories
- **WHEN** the user selects "Food" and "Transport" categories
- **THEN** transactions matching either "Food" (or its children) OR "Transport" (or its children) SHALL be shown

#### Scenario: Clear category filter
- **WHEN** the user deselects all categories
- **THEN** the transaction list SHALL show all transactions matching the other active filters

#### Scenario: Parent category includes children
- **WHEN** the user selects a parent category "Shopping" that has children "Clothing" and "Electronics"
- **THEN** transactions in "Clothing", "Electronics", or any other child of "Shopping" SHALL be included

### Requirement: Wallet filter
The system SHALL allow users to filter transactions by a single wallet. The system SHALL include an "All Wallets" option.

#### Scenario: Filter by wallet
- **WHEN** the user selects a specific wallet
- **THEN** only transactions belonging to that wallet SHALL be shown

#### Scenario: Show all wallets
- **WHEN** the user selects "All Wallets"
- **THEN** transactions from all wallets SHALL be shown

### Requirement: Paid status filter
The system SHALL allow users to filter by paid status with options for "All", "Paid", and "Not Paid".

#### Scenario: Filter by paid status
- **WHEN** the user selects "Paid"
- **THEN** only transactions with paid = true SHALL be shown

#### Scenario: Filter by unpaid status
- **WHEN** the user selects "Not Paid"
- **THEN** only transactions with paid = false SHALL be shown

### Requirement: Sortable results table
The system SHALL display transaction results in a table with the same columns as the dashboard: Date, Description, Category, Wallet, Amount, Paid. The table SHALL be sorted by date descending by default.

#### Scenario: Default sort order
- **WHEN** the user navigates to the search page
- **THEN** transactions SHALL be sorted by date descending (most recent first)

### Requirement: Aggregate summary
The system SHALL display aggregate summaries above the results table: total income, total expense, and net balance for the filtered transactions.

#### Scenario: Display aggregates
- **WHEN** the user applies filters that result in transactions with $500 income and $300 expense
- **THEN** the system SHALL display total income as $500, total expense as $300, and net as $200

### Requirement: URL state persistence
All active filters (search text, date range, selected categories, wallet, paid status) SHALL be persisted in URL search params so the page state can be bookmarked or shared.

#### Scenario: Share filtered URL
- **WHEN** the user applies filters and copies the URL
- **THEN** pasting that URL in a new tab SHALL restore all filter states and show the same results

### Requirement: Navigation link
The system SHALL provide a navigation link to the search page in the sidebar menu.

#### Scenario: Navigate to search
- **WHEN** the user clicks "Search" in the sidebar
- **THEN** the user SHALL be taken to `/transactions`
