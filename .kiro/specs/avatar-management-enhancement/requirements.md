# Requirements Document

## Introduction

This feature enhances the avatar management system by consolidating the avatar selection functionality from `CharacterAvatar` component into the existing `SpriteListTab` component. The goal is to create a unified, reusable avatar management interface that supports all features currently available in the `CharacterAvatar` popup, including avatar deletion, name editing for dice maiden mode, avatar upload, and chat preview.

## Glossary

- **Avatar Management System**: The UI components and logic responsible for displaying, selecting, uploading, editing, and deleting character avatars
- **SpriteListTab**: The existing tab component that displays sprite/avatar lists with preview functionality
- **CharacterAvatar**: The current component containing a popup for avatar selection and management
- **Dice Maiden Mode**: A special mode (role.type === 1) where avatars can have custom editable names/labels
- **Avatar Title**: The label/name associated with an avatar, editable in Dice Maiden mode
- **Role Avatar**: An avatar object containing avatarId, avatarUrl, spriteUrl, and avatarTitle properties
- **Chat Preview**: A preview showing how the selected avatar appears in chat messages

## Requirements

### Requirement 1

**User Story:** As a user, I want to select and manage avatars through an enhanced SpriteListTab interface, so that I have a consistent experience across the application.

#### Acceptance Criteria

1. WHEN a user opens the avatar management interface THEN the system SHALL display all available avatars in a grid layout
2. WHEN a user clicks on an avatar in the grid THEN the system SHALL update the preview to show the selected avatar
3. WHEN a user confirms avatar selection THEN the system SHALL apply the selected avatar to the character and close the interface
4. WHEN the interface displays avatars THEN the system SHALL highlight the currently selected avatar with a visual indicator
5. WHEN the avatar list is empty THEN the system SHALL display an appropriate empty state message

### Requirement 2

**User Story:** As a user, I want to delete avatars I no longer need, so that I can keep my avatar collection organized.

#### Acceptance Criteria

1. WHEN a user hovers over an avatar in the grid THEN the system SHALL display a delete button on that avatar
2. WHEN a user clicks the delete button on an avatar THEN the system SHALL show a confirmation dialog before deletion
3. WHEN a user confirms avatar deletion THEN the system SHALL remove the avatar from the list and update the display
4. WHEN deleting the currently selected avatar THEN the system SHALL automatically select an alternative avatar from the remaining avatars
5. WHEN only one avatar remains in the list THEN the system SHALL hide the delete button to prevent deletion of the last avatar
6. WHEN the deleted avatar was the character's active avatar THEN the system SHALL update the character to use the replacement avatar

### Requirement 3

**User Story:** As a user in Dice Maiden mode, I want to edit avatar names, so that I can identify different avatar expressions easily.

#### Acceptance Criteria

1. WHEN the character type is Dice Maiden THEN the system SHALL display editable name labels below each avatar
2. WHEN a user clicks on an avatar name label THEN the system SHALL enter edit mode with an input field
3. WHEN a user types a new name and presses Enter THEN the system SHALL save the new name and exit edit mode
4. WHEN a user presses Escape during name editing THEN the system SHALL cancel editing and restore the previous name
5. WHEN a user clicks the save button during name editing THEN the system SHALL persist the new name to the backend
6. WHEN an avatar has no custom name THEN the system SHALL display a default name based on its position
7. WHEN the character type is not Dice Maiden THEN the system SHALL hide avatar name labels

### Requirement 4

**User Story:** As a user, I want to upload new avatars, so that I can expand my character's avatar collection.

#### Acceptance Criteria

1. WHEN the avatar grid is displayed THEN the system SHALL show an upload button as the last item in the grid
2. WHEN a user clicks the upload button THEN the system SHALL open a file selection dialog
3. WHEN a user selects an image file THEN the system SHALL upload the image and add it to the avatar list
4. WHEN the first avatar is uploaded for a character THEN the system SHALL automatically assign it the label "默认"
5. WHEN an avatar upload completes THEN the system SHALL refresh the avatar list to display the new avatar
6. WHEN an avatar upload fails THEN the system SHALL display an error message to the user

### Requirement 5

**User Story:** As a user, I want to preview how avatars look in different contexts, so that I can make informed selection decisions.

#### Acceptance Criteria

1. WHEN an avatar is selected THEN the system SHALL display a large preview of the avatar image
2. WHEN viewing the preview THEN the system SHALL provide a toggle to switch between sprite view and avatar view
3. WHEN the toggle is activated THEN the system SHALL smoothly transition between sprite and avatar preview modes
4. WHEN in avatar preview mode THEN the system SHALL display a chat preview showing how the avatar appears in messages
5. WHEN no sprite is available for an avatar THEN the system SHALL display a "暂无立绘" message in sprite preview mode
6. WHEN loading a large sprite image THEN the system SHALL display a loading spinner until the image is ready

### Requirement 6

**User Story:** As a user, I want to crop avatars to ensure proper framing, so that my character looks good in all contexts.

#### Acceptance Criteria

1. WHEN the avatar management interface is open THEN the system SHALL provide a "裁剪头像" button
2. WHEN a user clicks the crop button THEN the system SHALL open the sprite cropper interface
3. WHEN the user completes cropping THEN the system SHALL update the avatar with the cropped version
4. WHEN the user cancels cropping THEN the system SHALL close the cropper without making changes

### Requirement 7

**User Story:** As a developer, I want the SpriteListTab to support both standalone and embedded usage modes, so that it can replace CharacterAvatar while maintaining backward compatibility.

#### Acceptance Criteria

1. WHEN SpriteListTab is used in standalone mode THEN the system SHALL display all avatar management features including delete and upload
2. WHEN SpriteListTab is used in embedded mode THEN the system SHALL hide features specified by the parent component
3. WHEN SpriteListTab receives all avatars (not just sprites) THEN the system SHALL display them correctly in the grid
4. WHEN SpriteListTab is configured for avatar management THEN the system SHALL show appropriate action buttons for avatar operations
5. WHEN the component receives role information THEN the system SHALL conditionally enable Dice Maiden features based on role type

### Requirement 8

**User Story:** As a user, I want responsive avatar management on mobile devices, so that I can manage avatars effectively on any screen size.

#### Acceptance Criteria

1. WHEN viewing on mobile devices THEN the system SHALL adjust the layout to a single-column vertical arrangement
2. WHEN viewing on desktop devices THEN the system SHALL display a multi-column layout with side-by-side preview
3. WHEN on mobile THEN the system SHALL show delete buttons without requiring hover
4. WHEN on desktop THEN the system SHALL show delete buttons only on hover for a cleaner interface
5. WHEN the screen size changes THEN the system SHALL adapt the layout responsively without losing state

### Requirement 9

**User Story:** As a user, I want to select multiple avatars at once, so that I can perform batch operations efficiently.

#### Acceptance Criteria

1. WHEN a user activates multi-select mode THEN the system SHALL display checkboxes on all avatar items in the grid
2. WHEN a user clicks an avatar in multi-select mode THEN the system SHALL toggle the selection state of that avatar
3. WHEN avatars are selected in multi-select mode THEN the system SHALL display a visual indicator showing which avatars are selected
4. WHEN a user exits multi-select mode THEN the system SHALL clear all selections and hide checkboxes
5. WHEN no avatars are selected in multi-select mode THEN the system SHALL disable batch action buttons
6. WHEN the user selects all avatars THEN the system SHALL provide a "select all" option to toggle all selections at once

### Requirement 10

**User Story:** As a user, I want to delete multiple avatars at once, so that I can quickly clean up my avatar collection.

#### Acceptance Criteria

1. WHEN multiple avatars are selected THEN the system SHALL display a batch delete button
2. WHEN a user clicks the batch delete button THEN the system SHALL show a confirmation dialog indicating the number of avatars to be deleted
3. WHEN a user confirms batch deletion THEN the system SHALL remove all selected avatars from the list
4. WHEN the currently active avatar is included in the batch deletion THEN the system SHALL automatically select a replacement avatar from the remaining avatars
5. WHEN batch deletion would remove all avatars THEN the system SHALL prevent the operation and display a warning message
6. WHEN batch deletion completes THEN the system SHALL exit multi-select mode and refresh the avatar list

### Requirement 11

**User Story:** As a user, I want to batch transfer selected avatars to correction tools, so that I can efficiently process multiple avatars.

#### Acceptance Criteria

1. WHEN multiple avatars are selected THEN the system SHALL display batch transfer buttons for avatar correction and sprite correction
2. WHEN a user clicks the batch avatar correction button THEN the system SHALL open the avatar correction interface with the selected avatars
3. WHEN a user clicks the batch sprite correction button THEN the system SHALL open the sprite correction interface with the selected avatars
4. WHEN selected avatars lack sprite data and sprite correction is requested THEN the system SHALL filter out avatars without sprites and display a notification
5. WHEN batch transfer is initiated THEN the system SHALL pass the selected avatar IDs to the correction interface
6. WHEN returning from batch correction THEN the system SHALL refresh the avatar list to reflect any changes made during correction

### Requirement 12

**User Story:** As a user, I want avatar deletion and selection to work correctly together, so that I don't lose my character's avatar when managing the avatar list.

#### Acceptance Criteria

1. WHEN a user deletes an avatar THEN the system SHALL wait for the deletion to complete before updating the UI state
2. WHEN a user deletes the character's current avatar THEN the system SHALL immediately apply a replacement avatar to the character before completing the deletion
3. WHEN a user uploads a new avatar, deletes the old avatar, and selects the new avatar THEN the system SHALL correctly apply the new avatar to the character
4. WHEN avatar operations are in progress THEN the system SHALL prevent concurrent operations that could cause state inconsistency
5. WHEN an avatar deletion fails THEN the system SHALL revert any optimistic UI updates and display an error message
6. WHEN the avatar list is refreshed after operations THEN the system SHALL maintain the correct selected avatar state based on the character's current avatar
