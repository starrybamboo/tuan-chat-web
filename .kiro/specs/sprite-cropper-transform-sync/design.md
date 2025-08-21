# Design Document

## Overview

This design addresses the transform state synchronization issue in the SpriteCropper component. Currently, the component maintains its own local transform state that starts with default values, ignoring the avatar's actual saved transform parameters. The solution involves modifying the SpriteCropper to receive and use the current avatar's transform state, and updating this state when switching between sprites.

## Architecture

The current data flow for transform state:
1. **SpriteRenderStudio** → parses transform from roleAvatars data → maintains displayTransform state
2. **SpriteCropper** → creates its own local transform state (disconnected from avatar data)

The enhanced data flow:
1. **SpriteRenderStudio** → passes current avatar and its transform state to SpriteCropper
2. **SpriteCropper** → receives and uses the avatar's actual transform state
3. **SpriteCropper** → updates transform state when switching sprites based on each sprite's saved parameters

## Components and Interfaces

### 1. SpriteCropper Component Modifications

#### Current Interface
```typescript
interface SpriteCropperProps {
  spriteUrl?: string;
  roleAvatars?: RoleAvatar[];
  initialSpriteIndex?: number;
  characterName: string;
  dialogContent?: string;
  onCropComplete?: (croppedImageUrl: string) => void;
  onBatchCropComplete?: (croppedImages: { avatarId: number; croppedImageUrl: string }[]) => void;
  onClose?: () => void;
}
```

#### Enhanced Interface
```typescript
interface SpriteCropperProps {
  spriteUrl?: string;
  roleAvatars?: RoleAvatar[];
  initialSpriteIndex?: number;
  characterName: string;
  dialogContent?: string;
  // NEW: Current avatar's transform state
  initialTransform?: Transform;
  // NEW: Current avatar data for context
  currentAvatar?: RoleAvatar;
  onCropComplete?: (croppedImageUrl: string) => void;
  onBatchCropComplete?: (croppedImages: { avatarId: number; croppedImageUrl: string }[]) => void;
  onClose?: () => void;
}
```

### 2. SpriteRenderStudio Component Modifications

The SpriteRenderStudio already has the logic to parse transform parameters from avatar data. It needs to pass this information to the SpriteCropper when opening the popup.

#### Current Popup Opening
```typescript
const handleOpenPopWindow = () => {
  setIsPopWindowOpen(true);
};
```

#### Enhanced Popup Opening
```typescript
const handleOpenPopWindow = () => {
  setIsPopWindowOpen(true);
  // Transform state is already available as 'transform' and current sprite as 'currentSprite'
};
```

### 3. Transform State Management

#### Current SpriteCropper Transform State
```typescript
// Local state disconnected from avatar data
const [transform, setTransform] = useState<Transform>({
  scale: 1,
  positionX: 0,
  positionY: 0,
  alpha: 1,
  rotation: 0,
});
```

#### Enhanced SpriteCropper Transform State
```typescript
// Helper function to parse transform from avatar (reuse from SpriteRenderStudio)
const parseTransformFromAvatar = (avatar: RoleAvatar | null): Transform => {
  if (!avatar) {
    return { scale: 1, positionX: 0, positionY: 0, alpha: 1, rotation: 0 };
  }
  
  const scale = avatar.spriteScale ? parseFloat(avatar.spriteScale) : 1;
  const positionX = avatar.spriteXPosition ? parseFloat(avatar.spriteXPosition) : 0;
  const positionY = avatar.spriteYPosition ? parseFloat(avatar.spriteYPosition) : 0;
  const alpha = avatar.spriteTransparency ? parseFloat(avatar.spriteTransparency) : 1;
  const rotation = avatar.spriteRotation ? parseFloat(avatar.spriteRotation) : 0;
  
  return {
    scale: Math.max(0, Math.min(2, isNaN(scale) ? 1 : scale)),
    positionX: Math.max(-300, Math.min(300, isNaN(positionX) ? 0 : positionX)),
    positionY: Math.max(-300, Math.min(300, isNaN(positionY) ? 0 : positionY)),
    alpha: Math.max(0, Math.min(1, isNaN(alpha) ? 1 : alpha)),
    rotation: Math.max(0, Math.min(360, isNaN(rotation) ? 0 : rotation)),
  };
};

// Initialize with current avatar's transform or passed initial transform
const [transform, setTransform] = useState<Transform>(() => {
  if (initialTransform) {
    return initialTransform;
  }
  if (isBatchMode && spritesAvatars.length > 0) {
    return parseTransformFromAvatar(spritesAvatars[currentSpriteIndex]);
  }
  return parseTransformFromAvatar(currentAvatar);
});
```

## Data Models

### Transform Synchronization Flow

1. **Initialization**: SpriteCropper receives initial transform state from SpriteRenderStudio
2. **Sprite Switching**: When currentSpriteIndex changes, update transform state based on new sprite's data
3. **State Updates**: When transform is applied, update both local state and backend, then sync back to parent

### State Synchronization Pattern

```typescript
// In SpriteCropper: React to sprite index changes
useEffect(() => {
  if (isBatchMode && spritesAvatars.length > 0) {
    const newSprite = spritesAvatars[currentSpriteIndex];
    const newTransform = parseTransformFromAvatar(newSprite);
    setTransform(newTransform);
  }
}, [currentSpriteIndex, spritesAvatars, isBatchMode]);
```

### Data Consistency Strategy

1. **Single Source of Truth**: Avatar data from the database is the authoritative source
2. **Local State Sync**: SpriteCropper's transform state reflects the current avatar's saved parameters
3. **Immediate Updates**: When transforms are applied, both backend and local state are updated
4. **Error Recovery**: If backend update fails, local state reverts to last known good state

## Error Handling

### Transform Data Validation
- **Missing Transform Data**: Use default values when avatar has no saved transform parameters
- **Invalid Transform Values**: Clamp values to valid ranges using the same logic as SpriteRenderStudio
- **Parse Errors**: Handle cases where string-to-number conversion fails gracefully

### State Synchronization Errors
- **Backend Update Failures**: Revert local transform state to previous values
- **Rapid Switching**: Debounce sprite switching to prevent race conditions
- **Data Inconsistency**: Validate that transform state matches expected avatar before applying changes

### User Experience
- **Loading States**: Show loading indicators during transform updates
- **Error Messages**: Provide clear feedback when transform operations fail
- **Unsaved Changes**: Warn users about unsaved changes when switching sprites or closing popup

## Testing Strategy

### Manual Testing Approach
1. **Transform Initialization**: Verify popup opens with correct transform values from avatar data
2. **Sprite Switching**: Test that transform controls update when switching between sprites
3. **State Persistence**: Confirm that applied changes are saved and reflected in main view
4. **Error Scenarios**: Test behavior with missing or invalid transform data

### Validation Points
1. **Data Flow**: Transform data flows correctly from SpriteRenderStudio to SpriteCropper
2. **State Sync**: Transform state updates properly when switching sprites
3. **Backend Integration**: Applied transforms are saved to database and reflected in UI
4. **Edge Cases**: Component handles missing data and error conditions gracefully

## Implementation Approach

### Phase 1: Data Flow Enhancement
1. Modify SpriteRenderStudio to pass current transform state and avatar data to SpriteCropper
2. Update SpriteCropper props interface to accept initial transform and current avatar
3. Replace local transform initialization with avatar-based initialization

### Phase 2: Sprite Switching Logic
1. Add useEffect to monitor currentSpriteIndex changes
2. Implement transform state updates when switching sprites
3. Add parseTransformFromAvatar helper function to SpriteCropper

### Phase 3: State Synchronization
1. Ensure transform updates are applied to the correct avatar
2. Add proper error handling for transform parsing and updates
3. Implement loading states and user feedback

### Phase 4: Testing and Refinement
1. Test all sprite switching scenarios
2. Verify transform data consistency between popup and main view
3. Handle edge cases and error conditions
4. Optimize performance for rapid sprite switching

## Security Considerations

- **Data Validation**: Validate transform values are within expected ranges before applying
- **State Integrity**: Ensure transform state changes are properly validated and sanitized
- **Error Handling**: Don't expose sensitive backend details in error messages
- **Input Sanitization**: Properly handle transform parameter parsing from string values