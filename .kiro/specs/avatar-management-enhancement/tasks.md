# Implementation Plan

- [x] 1. Extend SpriteListGrid with delete and name editing functionality





  - Add delete button to each avatar item with conditional visibility
  - Implement Dice Maiden name editing UI (input field, save/cancel buttons)
  - Add hover states and mobile-friendly delete button visibility
  - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ]* 1.1 Write property test for delete button visibility
  - **Property 2: Delete button visibility**
  - **Validates: Requirements 2.5**

- [ ]* 1.2 Write property test for Dice Maiden name editing visibility
  - **Property 4: Dice Maiden name editing visibility**
  - **Validates: Requirements 3.1, 3.7**

- [ ]* 1.3 Write property test for default name assignment
  - **Property 5: Default name assignment**
  - **Validates: Requirements 3.6**

- [x] 2. Add multi-select mode to SpriteListGrid





  - Implement multi-select mode toggle state
  - Add checkboxes to avatar grid items when in multi-select mode
  - Implement selection state management (Set of selected indices)
  - Add "select all" functionality
  - Add visual indicators for selected items
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 2.1 Write property test for multi-select mode state isolation
  - **Property 6: Multi-select mode state isolation**
  - **Validates: Requirements 9.4**

- [ ]* 2.2 Write property test for batch operation enablement
  - **Property 7: Batch operation enablement**




  - **Validates: Requirements 9.5, 10.1**

- [x] 3. Implement avatar deletion logic with proper state management



  - Create delete mutation with TanStack Query
  - Implement optimistic updates with rollback on failure
  - Add replacement avatar selection logic when deleting current avatar
  - Handle edge case of deleting character's active avatar
  - Implement sequential operation handling (delete then select)
  - _Requirements: 2.3, 2.4, 2.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ]* 3.1 Write property test for replacement avatar selection
  - **Property 3: Replacement avatar selection**
  - **Validates: Requirements 2.4, 12.2**

- [ ]* 3.2 Write property test for operation sequencing
  - **Property 10: Operation sequencing**
  - **Validates: Requirements 12.1, 12.4**

- [ ]* 3.3 Write property test for optimistic update rollback
  - **Property 11: Optimistic update rollback**
  - **Validates: Requirements 12.5**

- [ ]* 3.4 Write property test for avatar list refresh consistency
  - **Property 12: Avatar list refresh consistency**
  - **Validates: Requirements 12.6**

- [x] 4. Implement Dice Maiden avatar name editing backend integration





  - Create update avatar title mutation
  - Implement save handler with validation (reject empty names)
  - Add keyboard shortcuts (Enter to save, Escape to cancel)
  - Implement optimistic updates for name changes
  - _Requirements: 3.5, 3.6, 4.5_





- [ ] 5. Add batch delete functionality




  - Create batch delete confirmation dialog
  - Implement batch delete mutation with progress tracking
  - Add protection against deleting all avatars
  - Handle replacement avatar selection for batch operations
  - Implement error handling for partial failures
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ]* 5.1 Write property test for last avatar protection
  - **Property 8: Last avatar protection**
  - **Validates: Requirements 10.5**

- [ ] 6. Implement batch transfer to correction tools
  - Add batch avatar correction button and handler
  - Add batch sprite correction button and handler
  - Implement sprite filtering logic (only avatars with spriteUrl)
  - Create notification for filtered avatars
  - Pass selected avatar IDs to correction interfaces
  - Handle return from correction tools with list refresh
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ]* 6.1 Write property test for sprite filtering
  - **Property 9: Sprite filtering for correction**
  - **Validates: Requirements 11.4**

- [ ] 7. Extend SpriteListTab with enhanced props and state management
  - Add new props: role, allAvatars, mode, callbacks for delete/upload/batch operations
  - Implement mode switching logic (sprite-management vs avatar-management)
  - Add state management for multi-select mode
  - Add state management for delete confirmation dialogs
  - Add state management for avatar name editing
  - Integrate enhanced SpriteListGrid with new props
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 7.1 Write property test for avatar selection consistency
  - **Property 1: Avatar selection consistency**
  - **Validates: Requirements 1.2, 1.4**

- [ ] 8. Add action buttons for multi-select mode
  - Create conditional rendering for single vs multi-select action buttons
  - Implement batch delete button with disabled state logic
  - Implement batch avatar correction button
  - Implement batch sprite correction button
  - Add visual feedback for batch operations in progress
  - _Requirements: 9.5, 10.1, 11.1, 11.2_

- [x] 9. Implement avatar upload integration






  - Integrate CharacterCopper component for upload
  - Add upload success handler with list refresh
  - Implement first avatar auto-naming to "默认"
  - Handle upload errors with user feedback
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 10. Add crop functionality integration
  - Add crop button to action buttons
  - Integrate SpriteCropper component
  - Pass selected avatar to cropper
  - Handle crop completion with list refresh
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 11. Implement responsive layout adjustments
  - Add mobile-specific layout (single column, always-visible delete buttons)
  - Add tablet layout (two columns, hover delete buttons)
  - Add desktop layout (three columns, side-by-side preview)
  - Implement responsive preview toggle behavior
  - Test layout transitions on screen size changes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Add confirmation dialogs
  - Create single delete confirmation dialog
  - Create batch delete confirmation dialog with count display
  - Implement dialog state management
  - Add proper focus management for accessibility
  - _Requirements: 2.2, 10.2_

- [ ] 13. Implement error handling and user feedback
  - Add error notifications for failed operations
  - Implement loading states for async operations
  - Add success notifications for completed operations
  - Implement retry logic for failed network requests
  - _Requirements: 4.6, 12.5_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Replace CharacterAvatar usage with enhanced SpriteListTab



  - Identify all usages of CharacterAvatar component
  - Create wrapper component if needed for backward compatibility
  - Replace CharacterAvatar with enhanced SpriteListTab
  - Pass all required props (role, allAvatars, callbacks)
  - Test all replaced usages thoroughly
  - _Requirements: 1.1, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 16. Add accessibility features
  - Add ARIA labels to all interactive elements
  - Implement keyboard navigation for avatar grid
  - Add focus management for dialogs and modals
  - Implement screen reader announcements for state changes
  - Test with keyboard-only navigation
  - Test with screen readers

- [ ] 17. Performance optimization
  - Add React.memo to preview components
  - Implement lazy loading for avatar images
  - Add debouncing to name edit saves
  - Optimize re-renders with proper dependency arrays
  - Test performance with large avatar lists (20+ avatars)

- [ ] 18. Final integration testing
  - Test complete upload → delete → select flow
  - Test multi-select batch operations end-to-end
  - Test Dice Maiden name editing persistence
  - Test responsive behavior across all breakpoints
  - Test error scenarios and recovery
  - Verify no memory leaks or performance issues

- [ ] 19. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
