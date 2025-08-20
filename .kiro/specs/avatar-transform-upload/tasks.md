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

- [x] 6. Enhance SpriteRenderStudio to read and apply transform data




  - Parse transform parameters from roleAvatars API response data
  - Convert string transform values back to numeric values for rendering
  - Apply transform values (position, scale, transparency, rotation) to canvas rendering
  - Handle cases where transform data is missing or invalid with default values
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7. Create mutation hook for updating avatar transforms



  - Create useUpdateAvatarTransformMutation hook similar to useUploadAvatarMutation
  - Accept roleId, avatarId, and transform parameters
  - Map transform data to backend string format for updateRoleAvatar API
  - Include proper error handling and cache invalidation
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Implement SpriteCropper transform application buttons




  - Replace placeholder "应用位移" button with actual transform update functionality
  - Implement single mode transform application using the new mutation hook
  - Replace placeholder "一键位移" button with batch transform update functionality
  - Add loading states and error handling for transform update operations
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 9. Create mutation hook for applying crop operations



  - Create useApplyCropMutation hook for uploading cropped sprite images
  - Accept roleId, avatarId, cropped image blob, and optional transform parameters
  - Handle image upload and avatar record update with new spriteUrl
  - Include proper error handling and cache invalidation
  - _Requirements: 6.1, 6.2, 6.3_




- [ ] 10. Implement SpriteCropper crop application buttons

  - Replace placeholder "应用裁剪" button with actual crop and upload functionality
  - Generate cropped image from canvas and upload as new spriteUrl
  - Replace placeholder "一键裁剪" button with batch crop and upload functionality
  - Add loading states and error handling for crop operations
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_