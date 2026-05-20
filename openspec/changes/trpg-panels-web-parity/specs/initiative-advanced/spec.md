## ADDED Requirements

### Requirement: Initiative list supports column sorting
The initiative panel SHALL allow sorting entries by different columns (initiative value, name, HP) and toggling sort direction (ascending/descending). The current sort key and direction SHALL be visually indicated.

#### Scenario: Sort by initiative value descending (default)
- **WHEN** the initiative list is displayed
- **THEN** entries are sorted by initiative value in descending order by default

#### Scenario: Toggle sort direction
- **WHEN** user taps the current sort column header
- **THEN** the sort direction toggles between ascending and descending

#### Scenario: Sort by different column
- **WHEN** user taps a different column header (e.g., HP)
- **THEN** entries re-sort by that column and the sort indicator moves to the new column

### Requirement: Initiative entries support inline editing
The initiative panel SHALL allow editing initiative value, HP, and max HP fields by tapping the field directly. The field SHALL become an editable TextInput on tap and save on blur.

#### Scenario: Edit initiative value inline
- **WHEN** user taps an initiative value cell in the list
- **THEN** the cell becomes an editable TextInput with the current value pre-filled

#### Scenario: Save on blur
- **WHEN** user finishes editing (field loses focus)
- **THEN** the new value is saved and the field returns to display mode

#### Scenario: Cancel edit with empty value
- **WHEN** user clears the field and blurs
- **THEN** the original value is restored

### Requirement: Initiative supports custom parameters
The initiative panel SHALL support user-defined custom parameter columns. Users can add parameters with a label and source (manual input or bound to a role attribute key). Custom parameter values SHALL display in the initiative list and be editable when source is manual.

#### Scenario: Add manual custom parameter
- **WHEN** user adds a custom parameter with label "AC" and source "manual"
- **THEN** a new column "AC" appears in the initiative list with editable cells

#### Scenario: Add role-attribute-bound parameter
- **WHEN** user adds a custom parameter with label "力量" and source "roleAttr" with key "str"
- **THEN** a new column "力量" appears with values auto-populated from each role's character sheet attribute "str"

#### Scenario: Remove custom parameter
- **WHEN** user removes a custom parameter
- **THEN** the column disappears from the initiative list

### Requirement: Import handles duplicate names
When importing a role whose name already exists in the initiative list, the system SHALL automatically append a numeric suffix to avoid duplicates.

#### Scenario: Import role with existing name
- **WHEN** user imports a role named "战士" and "战士" already exists in the list
- **THEN** the imported entry is named "战士(2)" (or next available suffix)

#### Scenario: Import role with unique name
- **WHEN** user imports a role whose name does not exist in the list
- **THEN** the entry uses the role's original name without modification
