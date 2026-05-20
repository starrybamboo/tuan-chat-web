## ADDED Requirements

### Requirement: Map displays visual grid overlay on image
The map panel SHALL render a grid overlay on top of the map image that aligns precisely with the image's rendered area (accounting for object-contain letterboxing). The grid SHALL display lines based on the configured row and column count, using the configured grid color.

#### Scenario: Grid overlay renders on map image
- **WHEN** a map image is loaded and grid dimensions are configured (e.g., 10 rows x 10 cols)
- **THEN** the system renders grid lines over the image area, with line count matching the configured dimensions and line color matching the configured grid color

#### Scenario: Grid aligns to image with letterboxing
- **WHEN** the map image aspect ratio differs from the container aspect ratio
- **THEN** the grid overlay aligns to the actual rendered image area (not the container), leaving letterbox areas uncovered

### Requirement: Tokens display as role avatars on grid
The map panel SHALL display placed tokens as circular role avatar images positioned at their assigned grid cell coordinates. Token size SHALL scale dynamically based on grid density.

#### Scenario: Token renders at correct grid position
- **WHEN** a token is placed at row 2, column 3 on a 10x10 grid
- **THEN** the token avatar renders centered in the cell at row 2, column 3 of the grid overlay

#### Scenario: Token size scales with grid density
- **WHEN** the grid has many cells (e.g., 20x20)
- **THEN** token avatars render smaller than on a sparse grid (e.g., 5x5), with a minimum visible size of 12px and maximum of 32px

### Requirement: Token placement via two-step tap interaction
The map panel SHALL support placing tokens via a two-step interaction: first tap an unplaced role to select it, then tap a grid cell to place it there. Moving an existing token SHALL follow the same pattern: tap the token to select, then tap the destination cell. Token placement, movement, removal, and selection changes SHALL be emitted as `STATE_EVENT` messages; map background, grid size, and grid color SHALL continue to use the existing `roomDndMap` persistence.

#### Scenario: Place new token on grid
- **WHEN** user taps an unplaced role from the role list, then taps an empty grid cell
- **THEN** the token is placed at the tapped cell and the role is removed from the unplaced list

#### Scenario: Move existing token to new cell
- **WHEN** user taps a placed token on the grid, then taps a different empty cell
- **THEN** the token moves to the new cell position

#### Scenario: Deselect by tapping same token again
- **WHEN** user taps a selected token or role again
- **THEN** the selection is cleared and no placement occurs

#### Scenario: Tap occupied cell while placing
- **WHEN** user has a role selected and taps a cell that already has a token
- **THEN** the existing token is replaced or moved according to the current selection rules, and the new position is recorded as a state event

#### Scenario: Selection state follows token actions
- **WHEN** a token is placed, moved, removed, or deselected
- **THEN** the current selected token state is updated through a `STATE_EVENT` atom and the UI reflects the new selection state

### Requirement: Unplaced roles section shows available characters
The map panel SHALL display a list of roles that have not been placed on the grid, with their avatars and names. Tapping an unplaced role SHALL select it for placement.

#### Scenario: Unplaced roles list updates after placement
- **WHEN** a role is placed on the grid
- **THEN** it is removed from the unplaced roles section

#### Scenario: Removed token returns to unplaced list
- **WHEN** a token is removed from the grid
- **THEN** the corresponding role reappears in the unplaced roles section
