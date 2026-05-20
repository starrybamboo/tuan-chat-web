## ADDED Requirements

### Requirement: Block a friend from the friends list
The mobile AllFriendsTab SHALL provide a block action for each friend in the list. Blocking SHALL require user confirmation before executing.

#### Scenario: Block friend with confirmation
- **WHEN** user taps the block button on a friend item and confirms the alert
- **THEN** the system calls the block API, removes the friend from the list, and shows a success message

#### Scenario: Cancel block action
- **WHEN** user taps the block button but cancels the confirmation alert
- **THEN** no action is taken and the friend remains in the list

#### Scenario: Block API fails
- **WHEN** the block API call fails after confirmation
- **THEN** the system shows an error alert with the failure reason

### Requirement: Block button visibility and state
The block button SHALL be visible for every friend in the AllFriendsTab list and SHALL be disabled while a block mutation is in progress.

#### Scenario: Button disabled during pending mutation
- **WHEN** a block mutation is in progress
- **THEN** the block button is disabled to prevent duplicate requests

#### Scenario: Block button accessible
- **WHEN** the friends list is displayed
- **THEN** each friend row includes a block button with appropriate accessibility label "拉黑"
