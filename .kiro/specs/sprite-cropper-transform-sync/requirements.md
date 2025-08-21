# Requirements Document

## Introduction

This feature enhancement addresses an issue in the SpriteCropper component where it maintains its own local transform state instead of using the avatar's actual transform parameters from the database. When the sprite correction popup opens, it should initialize with the current avatar's transform state, and when switching between sprites, the transform controls should update to reflect each sprite's individual transform parameters.

## Requirements

### Requirement 1

**User Story:** As a user opening the sprite correction popup, I want the transform controls to show the current avatar's saved transform parameters, so that I can see and modify the existing positioning rather than starting from default values.

#### Acceptance Criteria

1. WHEN the sprite correction popup opens THEN the system SHALL initialize the transform state with the current avatar's saved transform parameters (spriteXPosition, spriteYPosition, spriteScale, spriteTransparency, spriteRotation)
2. WHEN the current avatar has no saved transform parameters THEN the system SHALL use default transform values (scale: 1, positions: 0, alpha: 1, rotation: 0)
3. WHEN the transform controls are displayed THEN the system SHALL show the actual values from the avatar's database record
4. WHEN the avatar's transform data is invalid or missing THEN the system SHALL gracefully handle the error with appropriate default values

### Requirement 2

**User Story:** As a user switching between different sprites in the correction popup, I want the transform controls to update to show each sprite's individual transform parameters, so that I can see and modify the specific positioning for each sprite.

#### Acceptance Criteria

1. WHEN the user switches to a different sprite in the popup THEN the system SHALL update the transform state to reflect the new sprite's saved transform parameters
2. WHEN switching between sprites THEN the system SHALL preserve any unsaved changes by applying them before switching (if the user chooses to)
3. WHEN the new sprite has different transform parameters THEN the system SHALL smoothly update the transform controls to show the new values
4. WHEN switching sprites rapidly THEN the system SHALL handle the state transitions without causing UI glitches or incorrect values

### Requirement 3

**User Story:** As a user making transform adjustments in the sprite correction popup, I want my changes to be applied to the correct sprite's transform parameters, so that each sprite maintains its individual positioning settings.

#### Acceptance Criteria

1. WHEN the user applies transform changes THEN the system SHALL update the correct avatar's transform parameters in the database
2. WHEN working in batch mode THEN the system SHALL track which sprite's transform parameters are being modified
3. WHEN the user applies changes to one sprite THEN the system SHALL not affect other sprites' transform parameters unless explicitly requested
4. WHEN transform updates are successful THEN the system SHALL update the local state to reflect the saved values

### Requirement 4

**User Story:** As a user working with multiple sprites, I want the sprite correction popup to maintain consistency between the main view and the popup view, so that I see the same transform state in both places.

#### Acceptance Criteria

1. WHEN the popup opens THEN the system SHALL use the same transform state that is currently displayed in the main SpriteRenderStudio component
2. WHEN transform changes are applied in the popup THEN the system SHALL update the main view to reflect the changes
3. WHEN the popup is closed THEN the system SHALL ensure the main view shows the current saved state
4. WHEN there are unsaved changes in the popup THEN the system SHALL provide appropriate user feedback about the unsaved state