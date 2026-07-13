## ADDED Requirements

### Requirement: Shared test factories exist for core entities
The system SHALL provide factory functions in `src/lib/test-utils/factories.ts` that produce valid entity objects for testing utility functions that consume them.

#### Scenario: buildWallet creates a wallet with defaults
- **WHEN** `buildWallet()` is called with no arguments
- **THEN** it returns a `Wallet`-shaped object with sensible default values for all fields

#### Scenario: buildWallet accepts overrides
- **WHEN** `buildWallet({ name: "Savings" })` is called
- **THEN** it returns a wallet with `name: "Savings"` and default values for other fields

#### Scenario: buildTransaction creates a transaction with defaults
- **WHEN** `buildTransaction()` is called
- **THEN** it returns a transaction-like object suitable for passing to `calculateDashboardData`

#### Scenario: buildCategory creates a category with defaults
- **WHEN** `buildCategory()` is called
- **THEN** it returns a category object with sensible defaults

#### Scenario: Factories support building lists
- **WHEN** `buildList(buildTransaction, 5)` is called
- **THEN** it returns an array of 5 transaction objects
