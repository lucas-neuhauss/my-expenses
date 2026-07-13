## ADDED Requirements

### Requirement: User can view subscriptions list
The system SHALL display a subscriptions page with a list of all subscriptions for the authenticated user.

#### Scenario: Subscriptions page loads
- **WHEN** a logged-in user navigates to `/subscriptions`
- **THEN** the subscriptions page displays with the list of existing subscriptions

#### Scenario: Subscription page shows empty state
- **WHEN** a logged-in user navigates to `/subscriptions` and has no subscriptions
- **THEN** the page shows an empty state or "No subscriptions" message

### Requirement: User can create a subscription
The system SHALL allow authenticated users to create new subscriptions with name, amount, category, wallet, day of month, start date, and optional end date.

#### Scenario: Create a simple subscription
- **WHEN** a logged-in user opens the create subscription dialog, fills in name, amount, selects category and wallet, sets day of month and start date
- **THEN** the subscription is saved and appears in the subscriptions list

### Requirement: User can edit a subscription
The system SHALL allow authenticated users to modify existing subscriptions.

#### Scenario: Edit a subscription
- **WHEN** a logged-in user clicks edit on an existing subscription, changes the name and amount
- **THEN** the subscription is updated and reflects the new values in the list

### Requirement: User can delete a subscription
The system SHALL allow authenticated users to delete existing subscriptions.

#### Scenario: Delete a subscription
- **WHEN** a logged-in user clicks delete on an existing subscription and confirms
- **THEN** the subscription is removed from the list

### Requirement: User can pause and resume a subscription
The system SHALL allow authenticated users to toggle the paused state of a subscription.

#### Scenario: Pause a subscription
- **WHEN** a logged-in user clicks pause on an active subscription
- **THEN** the subscription shows as paused

#### Scenario: Resume a paused subscription
- **WHEN** a logged-in user clicks resume on a paused subscription
- **THEN** the subscription shows as active again
