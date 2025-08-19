# Implementation Plan

- [x] 1. Update CharacterCopper component to pass transform data


  - Modify the mutate callback in handleSubmit to include current transform state
  - Ensure transform data is passed along with avatarUrl and spriteUrl
  - _Requirements: 1.1, 2.1_


- [x] 2. Extend useUploadAvatarMutation to accept transform parameters

  - Update the mutation function signature to accept optional transform parameter
  - Add transform data mapping from frontend format to backend string format
  - Implement default values for backward compatibility when transform is not provided
  - _Requirements: 2.2, 2.3, 3.4_

- [x] 3. Update API call to include transform parameters


  - Modify the updateRoleAvatar call to include the new transform fields
  - Map Transform interface values to backend string format (spriteXPosition, spriteYPosition, etc.)
  - Add validation to ensure transform values are within acceptable ranges
  - _Requirements: 2.3, 3.2_

- [x] 4. Add error handling and validation



  - Implement value clamping for out-of-range transform parameters
  - Add fallback to default values if transform data is invalid
  - Ensure existing error handling continues to work with new parameters
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Test the complete data flow




  - Verify transform data flows from CharacterCopper through to backend API
  - Test that uploads work with and without transform data
  - Confirm cache invalidation still works properly after uploads
  - _Requirements: 1.4, 3.1, 3.3_