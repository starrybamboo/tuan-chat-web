# Design Document

## Overview

This design enhances the existing avatar upload system to capture and persist Transform parameters (position, scale, transparency, rotation) from the CharacterCopper component to the backend. The enhancement involves modifying the data flow from the UI components through the mutation hooks to the backend API, ensuring Transform data is properly captured, validated, and stored.

## Architecture

The current architecture follows a React component hierarchy with data flowing from:
1. **CharacterCopper** (captures Transform state) → 
2. **CharacterAvatar** (handles upload coordination) → 
3. **useUploadAvatarMutation** (API mutation hook) → 
4. **Backend API** (updateRoleAvatar endpoint)

The enhancement will extend this flow to include Transform parameters at each level without disrupting the existing functionality.

## Components and Interfaces

### 1. Transform Data Structure

The existing Transform interface from TransformControl.tsx:
```typescript
interface Transform {
  scale: number;
  positionX: number;
  positionY: number;
  alpha: number;
  rotation: number;
}
```

### 2. Backend API Interface

The backend expects these additional parameters in updateRoleAvatar:
```typescript
interface UpdateRoleAvatarRequest {
  roleId: number;
  avatarId: number;
  avatarTitle: string;
  avatarUrl: string;
  spriteUrl: string;
  originUrl: string;
  spriteXPosition: string;    // maps to transform.positionX
  spriteYPosition: string;    // maps to transform.positionY
  spriteScale: string;        // maps to transform.scale
  spriteTransparency: string; // maps to transform.alpha
  spriteRotation: string;     // maps to transform.rotation
}
```

### 3. Component Modifications

#### CharacterCopper Component
- **Current State**: Already maintains Transform state internally
- **Enhancement**: Pass Transform data to parent component via mutate callback
- **Data Flow**: Include transform parameters in the mutate callback data

#### CharacterAvatar Component
- **Current State**: Receives mutate callback data and forwards to useUploadAvatarMutation
- **Enhancement**: Forward transform parameters from CharacterCopper to the mutation hook
- **Data Flow**: Pass through transform data without modification

#### useUploadAvatarMutation Hook
- **Current State**: Accepts avatarUrl, spriteUrl, roleId
- **Enhancement**: Accept additional transform parameters and map them to backend format
- **Data Flow**: Transform frontend Transform interface to backend string format

## Data Models

### Frontend Transform Model
```typescript
interface Transform {
  scale: number;        // 0-2 range
  positionX: number;    // -300 to 300 range
  positionY: number;    // -300 to 300 range
  alpha: number;        // 0-1 range
  rotation: number;     // 0-360 range
}
```

### Backend Transform Model
```typescript
interface BackendTransform {
  spriteXPosition: string;    // positionX.toString()
  spriteYPosition: string;    // positionY.toString()
  spriteScale: string;        // scale.toString()
  spriteTransparency: string; // alpha.toString()
  spriteRotation: string;     // rotation.toString()
}
```

### Mutation Function Signature
```typescript
interface UploadAvatarParams {
  avatarUrl: string;
  spriteUrl: string;
  roleId: number;
  transform?: Transform; // Optional for backward compatibility
}
```

## Error Handling

### Transform Parameter Validation
- **Missing Transform**: Use default values (scale: 1, positions: 0, alpha: 1, rotation: 0)
- **Invalid Transform Values**: Clamp values to valid ranges before sending to backend
- **API Errors**: Maintain existing error handling while providing specific messages for transform-related failures

### Backward Compatibility
- Transform parameters are optional in the mutation function
- If no transform is provided, use sensible defaults
- Existing upload flows continue to work without modification

### Error Recovery
- If transform parameters cause API failure, retry with default values
- Log transform-specific errors for debugging
- Maintain user experience by not blocking upload for transform issues

## Testing Strategy

### Simple Validation Approach
1. **Manual Testing**: Verify transform data flows correctly from UI to backend
2. **Console Logging**: Add temporary logs to verify data transformation at each step
3. **Basic Error Handling**: Ensure upload doesn't fail when transform data is present
4. **Backward Compatibility**: Verify existing upload flows continue to work

## Implementation Approach

### Phase 1: Data Flow Enhancement
1. Modify CharacterCopper to pass transform data in mutate callback
2. Update CharacterAvatar to forward transform data
3. Extend useUploadAvatarMutation to accept and process transform parameters

### Phase 2: Backend Integration
1. Map frontend Transform interface to backend string format
2. Include transform parameters in updateRoleAvatar API call
3. Handle default values and validation

### Phase 3: Error Handling & Testing
1. Implement comprehensive error handling
2. Add validation and default value logic
3. Ensure backward compatibility
4. Add appropriate logging for debugging

## Security Considerations

- **Input Validation**: Validate transform values are within expected ranges
- **Data Sanitization**: Ensure transform values are properly converted to strings
- **API Security**: Transform parameters don't introduce new security vulnerabilities
- **Error Information**: Don't expose sensitive backend details in transform-related error messages