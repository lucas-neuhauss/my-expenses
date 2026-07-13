## ADDED Requirements

### Requirement: Subscription helpers are extracted and tested
The system SHALL extract pure helper functions from `src/lib/server/data/subscription.ts` (`splitEqually`, `addMonths`, `getDateWithDay`, `parseDate`, `formatDateString`) into a shared module and test them.

#### Scenario: splitEqually splits cents evenly with remainder
- **WHEN** `splitEqually(100, 3)` is called
- **THEN** it returns `[34, 33, 33]` (remainder distributed to first parts)

#### Scenario: splitEqually handles exact division
- **WHEN** `splitEqually(100, 4)` is called
- **THEN** it returns `[25, 25, 25, 25]`

#### Scenario: splitEqually handles single part
- **WHEN** `splitEqually(100, 1)` is called
- **THEN** it returns `[100]`

#### Scenario: splitEqually handles zero cents
- **WHEN** `splitEqually(0, 5)` is called
- **THEN** it returns `[0, 0, 0, 0, 0]`

#### Scenario: addMonths adds months without year overflow
- **WHEN** `addMonths("2024-01-15", 2)` is called
- **THEN** it returns `"2024-03-15"`

#### Scenario: addMonths handles year overflow
- **WHEN** `addMonths("2024-11-15", 3)` is called
- **THEN** it returns `"2025-02-15"`

#### Scenario: addMonths clamps day for short months
- **WHEN** `addMonths("2024-01-31", 1)` is called
- **THEN** it returns `"2024-02-29"` (February 2024 has 29 days)

#### Scenario: addMonths clamps day for non-leap year February
- **WHEN** `addMonths("2023-01-31", 1)` is called
- **THEN** it returns `"2023-02-28"` (2023 is not a leap year)

#### Scenario: getDateWithDay handles month overflow
- **WHEN** `getDateWithDay(2024, 11, 31)` is called (month 11 = December, day 31)
- **THEN** it returns a Date for 2024-12-31

#### Scenario: getDateWithDay clamps day to month maximum
- **WHEN** `getDateWithDay(2024, 1, 31)` is called (month 1 = February)
- **THEN** it returns a Date for 2024-02-29 (leap year)

#### Scenario: parseDate parses YYYY-MM-DD strings
- **WHEN** `parseDate("2024-03-15")` is called
- **THEN** it returns a Date for March 15, 2024

#### Scenario: formatDateString formats Date to YYYY-MM-DD
- **WHEN** `formatDateString(new Date(2024, 2, 15))` is called
- **THEN** it returns `"2024-03-15"`

### Requirement: Error utilities are covered
The system SHALL test the `statusFor` function in `src/lib/errors/db.ts` for all mapped error tags.

#### Scenario: statusFor maps known tags to correct status codes
- **WHEN** `statusFor("EntityNotFoundError")` is called
- **THEN** it returns `404`
- **WHEN** `statusFor("ForbiddenError")` is called
- **THEN** it returns `403`
- **WHEN** `statusFor("DeleteWalletError")` is called
- **THEN** it returns `409`

#### Scenario: statusFor throws on unknown tags
- **WHEN** `statusFor("UnknownError")` is called
- **THEN** it throws an `Error` with message containing "No HTTP status mapping"
