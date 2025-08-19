# Requirements Document

## Introduction

This feature enhancement will extend the existing avatar upload functionality to include Transform parameters (position, scale, transparency, and rotation) that are currently captured in the CharacterCopper component but not persisted to the backend. The backend API has been updated to accept these additional parameters, and we need to modify the frontend to pass them during avatar upload.

## Requirements

### Requirement 1

**User Story:** As a user creating or editing character avatars, I want my sprite positioning and transformation settings to be saved automatically, so that my customizations are preserved and consistent across sessions.

#### Acceptance Criteria

1. WHEN a user adjusts sprite position, scale, transparency, or rotation in the CharacterCopper component THEN the system SHALL capture these transform values
2. WHEN a user uploads an avatar THEN the system SHALL include all transform parameters (spriteXPosition, spriteYPosition, spriteScale, spriteTransparency, spriteRotation) in the API request
3. WHEN the avatar upload is successful THEN the system SHALL persist all transform parameters to the backend database
4. WHEN a user loads an existing avatar THEN the system SHALL display the sprite with the previously saved transform parameters

### Requirement 2

**User Story:** As a developer maintaining the avatar system, I want the transform data to flow seamlessly from the UI components to the backend API, so that the system maintains data consistency and reduces manual parameter mapping.

#### Acceptance Criteria

1. WHEN the CharacterCopper component has transform state changes THEN the system SHALL pass the current transform values to the parent component
2. WHEN the useUploadAvatarMutation is called THEN the system SHALL accept transform parameters as part of the mutation function signature
3. WHEN the API request is made to updateRoleAvatar THEN the system SHALL include all required transform fields matching the backend interface specification
4. IF any transform parameter is missing or invalid THEN the system SHALL provide appropriate default values or error handling

### Requirement 3

**User Story:** As a user, I want the avatar upload process to remain smooth and error-free even with the additional transform data, so that my workflow is not disrupted by technical changes.

#### Acceptance Criteria

1. WHEN the avatar upload includes transform parameters THEN the system SHALL maintain the same user experience and loading states
2. WHEN an upload fails due to transform parameter issues THEN the system SHALL provide clear error messages to the user
3. WHEN the upload is successful THEN the system SHALL invalidate relevant queries to refresh the UI with updated data
4. WHEN transform parameters are not provided THEN the system SHALL use sensible default values to ensure backward compatibility