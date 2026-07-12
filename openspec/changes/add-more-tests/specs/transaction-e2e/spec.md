## ADDED Requirements

### Requirement: User can create a transaction with installments
The system SHALL allow authenticated users to create expense transactions split into multiple monthly installments.

#### Scenario: Create an installment expense transaction
- **WHEN** a logged-in user opens the create transaction dialog, selects "expense", fills in description and value, enables installments, sets count to 3
- **THEN** the transaction is created and 3 installment transactions appear in the dashboard for consecutive months

### Requirement: User can create a transference between wallets
The system SHALL allow authenticated users to transfer money between their wallets, creating matching income/expense pairs.

#### Scenario: Transfer between two wallets
- **WHEN** a logged-in user opens the create transaction dialog, selects "transference", picks source and destination wallets, enters an amount
- **THEN** an expense transaction appears in the source wallet and an income transaction appears in the destination wallet, linked by a transfer ID

#### Scenario: Cannot transfer to the same wallet
- **WHEN** a logged-in user selects "transference" and picks the same wallet for source and destination
- **THEN** the form shows a validation error: "Cannot transfer to the same wallet"
