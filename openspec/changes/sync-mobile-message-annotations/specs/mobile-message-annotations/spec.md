## ADDED Requirements

### Requirement: Mobile composer exposes message annotations
The mobile chat composer SHALL allow users to select message annotations from the shared annotation catalog.

#### Scenario: Open annotation picker
- **WHEN** a user taps the annotation control in the mobile chat composer
- **THEN** the mobile app SHALL open an annotation picker showing annotation options for the current send context

#### Scenario: Selected annotations remain visible
- **WHEN** a user selects one or more annotations
- **THEN** the mobile composer SHALL show the selected annotations before sending

### Requirement: Mobile annotation picker filters by message type
The mobile annotation picker SHALL filter annotation options by the message type they can apply to.

#### Scenario: Text message annotations
- **WHEN** the composer is sending a text-like message
- **THEN** the picker SHALL show text-compatible annotations such as figure, dialog, character effect, and clear controls

#### Scenario: Media message annotations
- **WHEN** the composer is sending a media message
- **THEN** the picker SHALL show only annotations compatible with that media type

### Requirement: Mobile send path persists only applicable annotations
The mobile send path SHALL persist selected annotations only on messages whose message type accepts those annotations.

#### Scenario: Sending a text message with annotations
- **WHEN** a user sends a text message with selected text-compatible annotations
- **THEN** the resulting room message request SHALL include those annotations

#### Scenario: Sending mixed uploaded media
- **WHEN** one composer submit creates multiple uploaded media drafts with different message types
- **THEN** each draft request SHALL include only annotations visible for that draft's message type

### Requirement: Mobile message list displays saved annotations
The mobile chat message list SHALL display saved message annotations in a compact mobile-appropriate form.

#### Scenario: Known annotation display
- **WHEN** a message has an annotation id found in the shared catalog
- **THEN** the message item SHALL display the annotation label or icon as a compact chip

#### Scenario: Unknown annotation display
- **WHEN** a message has an annotation id not found in the shared catalog
- **THEN** the message item SHALL display a compact fallback chip using the raw annotation id
