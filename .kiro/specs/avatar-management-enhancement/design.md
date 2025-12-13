# Design Document

## Overview

This design extends the `SpriteListTab` component to become a comprehensive avatar management interface that can replace the `CharacterAvatar` popup. The enhanced component will support all existing features (avatar selection, preview, upload) while adding new capabilities including multi-select mode, batch operations, avatar deletion, and Dice Maiden name editing.

The design follows React best practices with hooks for state management, TypeScript for type safety, and TanStack Query for server state synchronization. The component will be fully responsive and support both standalone and embedded usage modes.

## Architecture

### Component Hierarchy

```
SpriteListTab (Enhanced)
├── SpriteListGrid (Enhanced)
│   ├── Avatar Grid Items
│   │   ├── Avatar Image
│   │   ├── Selection Checkbox (multi-select mode)
│   │   ├── Delete Button
│   │   └── Name Label (Dice Maiden mode)
│   └── Upload Button
├── Preview Section
│   ├── Preview Header (with toggle)
│   ├── Image Preview (sprite/avatar)
│   └── Chat Preview (AvatarPreview component)
├── Action Buttons
│   ├── Single Mode Actions
│   │   ├── Apply Avatar
│   │   ├── Preview
│   │   └── Crop
│   └── Multi-Select Mode Actions
│       ├── Batch Delete
│       ├── Batch Avatar Correction
│       └── Batch Sprite Correction
└── Confirmation Dialogs
    ├── Delete Confirmation
    └── Batch Delete Confirmation
```

### State Management Strategy

1. **Local UI State**: Managed with React useState for transient UI concerns
   - Multi-select mode toggle
   - Selected avatar indices (multi-select)
   - Preview mode (sprite vs avatar)
   - Edit mode for avatar names
   - Dialog visibility states

2. **Server State**: Managed with TanStack Query for data synchronization
   - Avatar list (via `getRoleAvatars` query)
   - Avatar mutations (upload, delete, update)
   - Optimistic updates with rollback on failure

3. **Props-based State**: For parent-child communication
   - Selected avatar ID (controlled by parent)
   - Role information (for Dice Maiden detection)
   - Callback handlers for state changes

## Components and Interfaces

### Enhanced SpriteListTab Interface

```typescript
interface SpriteListTabProps {
  // Existing props
  spritesAvatars: RoleAvatar[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  characterName: string;
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  onPreview?: () => void;
  onApply?: () => void;
  onOpenSpriteCorrection?: () => void;
  onOpenAvatarCorrection?: () => void;
  onOpenEmotionSettings?: () => void;
  
  // New props for enhanced functionality
  role: Role;  // For Dice Maiden detection and operations
  allAvatars: RoleAvatar[];  // All avatars, not just those with sprites
  mode?: 'sprite-management' | 'avatar-management';  // Usage mode
  onAvatarDelete?: (avatarId: number) => void;
  onAvatarUpload?: (data: any) => void;
  onBatchAvatarCorrection?: (avatarIds: number[]) => void;
  onBatchSpriteCorrection?: (avatarIds: number[]) => void;
  showUpload?: boolean;
  showDelete?: boolean;
  showCrop?: boolean;
}
```

### Enhanced SpriteListGrid Interface

```typescript
interface SpriteListGridProps {
  // Existing props
  avatars: RoleAvatar[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className?: string;
  gridCols?: string;
  showUpload?: boolean;
  onUpload?: (data: any) => void;
  fileName?: string;
  
  // New props for enhanced functionality
  multiSelectMode?: boolean;
  selectedIndices?: Set<number>;
  onToggleSelection?: (index: number) => void;
  onSelectAll?: () => void;
  showDelete?: boolean;
  onDelete?: (index: number) => void;
  isDiceMaiden?: boolean;
  editingAvatarId?: number | null;
  editingAvatarName?: string;
  onStartEditName?: (avatarId: number, currentName: string) => void;
  onSaveAvatarName?: (avatarId: number, name: string) => void;
  onCancelEditName?: () => void;
}
```

## Data Models

### Role Avatar Extended

```typescript
interface RoleAvatar {
  avatarId?: number;
  avatarUrl?: string;
  spriteUrl?: string;
  roleId?: number;
  avatarTitle?: {
    label?: string;
  };
  transform?: Transform;
}
```

### Multi-Select State

```typescript
interface MultiSelectState {
  enabled: boolean;
  selectedIndices: Set<number>;
  selectAll: boolean;
}
```

### Avatar Operation State

```typescript
interface AvatarOperationState {
  isDeleting: boolean;
  isUploading: boolean;
  isBatchProcessing: boolean;
  pendingOperations: Map<number, 'delete' | 'update'>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Avatar selection consistency
*For any* avatar list and selected avatar ID, the displayed preview should always match the avatar corresponding to that ID
**Validates: Requirements 1.2, 1.4**

### Property 2: Delete button visibility
*For any* avatar list with more than one avatar, delete buttons should be visible; for a list with exactly one avatar, delete buttons should be hidden
**Validates: Requirements 2.5**

### Property 3: Replacement avatar selection
*For any* avatar deletion where the deleted avatar is currently selected, the system should select a replacement avatar from the remaining avatars before completing the deletion
**Validates: Requirements 2.4, 12.2**

### Property 4: Dice Maiden name editing visibility
*For any* role where type equals 1 (Dice Maiden), avatar name labels should be displayed and editable; for all other role types, name labels should be hidden
**Validates: Requirements 3.1, 3.7**

### Property 5: Default name assignment
*For any* avatar without a custom name, the displayed name should be "默认" for the first avatar (index 0) and "头像{index + 1}" for all other avatars
**Validates: Requirements 3.6**

### Property 6: Multi-select mode state isolation
*For any* transition into multi-select mode, all selections should be cleared; for any transition out of multi-select mode, all selections should be cleared
**Validates: Requirements 9.4**

### Property 7: Batch operation enablement
*For any* multi-select state where no avatars are selected, all batch action buttons should be disabled; where one or more avatars are selected, batch action buttons should be enabled
**Validates: Requirements 9.5, 10.1**

### Property 8: Last avatar protection
*For any* batch delete operation, if the operation would delete all remaining avatars, the system should prevent the operation
**Validates: Requirements 10.5**

### Property 9: Sprite filtering for correction
*For any* batch sprite correction operation, only avatars with non-null spriteUrl values should be included in the transfer
**Validates: Requirements 11.4**

### Property 10: Operation sequencing
*For any* avatar deletion followed by avatar selection, the deletion must complete before the selection is applied
**Validates: Requirements 12.1, 12.4**

### Property 11: Optimistic update rollback
*For any* failed avatar operation, any optimistic UI updates should be reverted to the previous state
**Validates: Requirements 12.5**

### Property 12: Avatar list refresh consistency
*For any* avatar list refresh after operations, the selected avatar state should match the character's current avatar
**Validates: Requirements 12.6**

## Error Handling

### Error Categories

1. **Network Errors**
   - Avatar upload failures
   - Avatar deletion failures
   - Avatar update failures
   - Query refetch failures

2. **Validation Errors**
   - Empty avatar name submission
   - Invalid file type upload
   - Last avatar deletion attempt

3. **State Consistency Errors**
   - Selected avatar not found in list
   - Concurrent operation conflicts
   - Stale data after operations

### Error Handling Strategy

```typescript
// Mutation with error handling and rollback
const deleteAvatarMutation = useMutation({
  mutationFn: async (avatarId: number) => {
    return await tuanchat.avatarController.deleteRoleAvatar(avatarId);
  },
  onMutate: async (avatarId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['getRoleAvatars', roleId] });
    
    // Snapshot previous value
    const previousAvatars = queryClient.getQueryData(['getRoleAvatars', roleId]);
    
    // Optimistically update
    queryClient.setQueryData(['getRoleAvatars', roleId], (old) => 
      old?.filter(a => a.avatarId !== avatarId)
    );
    
    return { previousAvatars };
  },
  onError: (err, avatarId, context) => {
    // Rollback on error
    queryClient.setQueryData(
      ['getRoleAvatars', roleId],
      context?.previousAvatars
    );
    
    // Show error notification
    showErrorNotification('删除头像失败，请重试');
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['getRoleAvatars', roleId] });
  },
});
```

### Sequential Operation Handling

```typescript
// Ensure operations complete in sequence
async function handleDeleteAndSelect(
  avatarIdToDelete: number,
  replacementAvatarId: number
) {
  try {
    // Step 1: Apply replacement avatar to character first
    await onAvatarChange(replacementAvatar.avatarUrl, replacementAvatarId);
    
    // Step 2: Wait for character update to complete
    await queryClient.invalidateQueries({ queryKey: ['getRole', roleId] });
    
    // Step 3: Delete the avatar
    await deleteAvatarMutation.mutateAsync(avatarIdToDelete);
    
    // Step 4: Update local selection state
    onAvatarSelect(replacementAvatarId);
  } catch (error) {
    console.error('Operation sequence failed:', error);
    // Rollback handled by mutation error handlers
  }
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

1. **Avatar Selection Tests**
   - Selecting an avatar updates the preview
   - Selecting an avatar highlights it in the grid
   - Selecting an invalid index handles gracefully

2. **Delete Operation Tests**
   - Delete button hidden when only one avatar remains
   - Delete confirmation dialog appears on delete click
   - Replacement avatar selected when deleting current avatar

3. **Dice Maiden Name Editing Tests**
   - Name labels visible only in Dice Maiden mode
   - Enter key saves the name
   - Escape key cancels editing
   - Empty names are rejected

4. **Multi-Select Mode Tests**
   - Entering multi-select mode shows checkboxes
   - Exiting multi-select mode clears selections
   - Batch buttons disabled when no selection
   - Select all toggles all checkboxes

### Property-Based Testing

Property-based tests will use **fast-check** library for TypeScript/React to verify universal properties across many random inputs. Each test will run a minimum of 100 iterations.

```typescript
import fc from 'fast-check';

// Property 1: Avatar selection consistency
test('**Feature: avatar-management-enhancement, Property 1: Avatar selection consistency**', () => {
  fc.assert(
    fc.property(
      fc.array(avatarArbitrary, { minLength: 1, maxLength: 20 }),
      fc.integer({ min: 0 }),
      (avatars, selectedIndex) => {
        const validIndex = selectedIndex % avatars.length;
        const selectedAvatar = avatars[validIndex];
        
        render(<SpriteListTab 
          allAvatars={avatars}
          selectedIndex={validIndex}
          {...otherProps}
        />);
        
        const preview = screen.getByTestId('avatar-preview');
        expect(preview).toHaveAttribute('src', selectedAvatar.avatarUrl);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 3: Replacement avatar selection
test('**Feature: avatar-management-enhancement, Property 3: Replacement avatar selection**', () => {
  fc.assert(
    fc.property(
      fc.array(avatarArbitrary, { minLength: 2, maxLength: 20 }),
      fc.integer({ min: 0 }),
      async (avatars, deleteIndex) => {
        const validDeleteIndex = deleteIndex % avatars.length;
        const avatarToDelete = avatars[validDeleteIndex];
        
        const { result } = renderHook(() => useAvatarManagement({
          avatars,
          selectedAvatarId: avatarToDelete.avatarId,
        }));
        
        await act(async () => {
          await result.current.handleDelete(validDeleteIndex);
        });
        
        // After deletion, selected avatar should not be the deleted one
        expect(result.current.selectedAvatarId).not.toBe(avatarToDelete.avatarId);
        // Selected avatar should be from remaining avatars
        const remainingAvatars = avatars.filter(a => a.avatarId !== avatarToDelete.avatarId);
        expect(remainingAvatars.some(a => a.avatarId === result.current.selectedAvatarId)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 7: Batch operation enablement
test('**Feature: avatar-management-enhancement, Property 7: Batch operation enablement**', () => {
  fc.assert(
    fc.property(
      fc.array(avatarArbitrary, { minLength: 1, maxLength: 20 }),
      fc.array(fc.integer({ min: 0 })),
      (avatars, selectedIndices) => {
        const validIndices = new Set(
          selectedIndices.map(i => i % avatars.length)
        );
        
        render(<SpriteListTab 
          allAvatars={avatars}
          multiSelectMode={true}
          selectedIndices={validIndices}
          {...otherProps}
        />);
        
        const batchDeleteButton = screen.getByText('批量删除');
        
        if (validIndices.size === 0) {
          expect(batchDeleteButton).toBeDisabled();
        } else {
          expect(batchDeleteButton).not.toBeDisabled();
        }
      }
    ),
    { numRuns: 100 }
  );
});

// Property 10: Operation sequencing
test('**Feature: avatar-management-enhancement, Property 10: Operation sequencing**', () => {
  fc.assert(
    fc.property(
      fc.array(avatarArbitrary, { minLength: 2, maxLength: 10 }),
      fc.integer({ min: 0 }),
      async (avatars, deleteIndex) => {
        const validDeleteIndex = deleteIndex % avatars.length;
        const operations: string[] = [];
        
        const mockOnAvatarChange = jest.fn(() => {
          operations.push('change');
          return Promise.resolve();
        });
        
        const mockDeleteMutation = jest.fn(() => {
          operations.push('delete');
          return Promise.resolve();
        });
        
        const { result } = renderHook(() => useAvatarManagement({
          avatars,
          onAvatarChange: mockOnAvatarChange,
          deleteMutation: mockDeleteMutation,
        }));
        
        await act(async () => {
          await result.current.handleDeleteWithReplacement(validDeleteIndex);
        });
        
        // Verify operations occurred in correct order
        expect(operations).toEqual(['change', 'delete']);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify component interactions:

1. **Upload and Delete Flow**
   - Upload new avatar
   - Delete old avatar
   - Select new avatar
   - Verify character avatar updated correctly

2. **Multi-Select Batch Operations**
   - Enter multi-select mode
   - Select multiple avatars
   - Execute batch delete
   - Verify all selected avatars removed

3. **Dice Maiden Name Management**
   - Edit avatar name
   - Save name
   - Verify name persisted to backend
   - Verify name displayed correctly after refresh

## Implementation Notes

### Responsive Design Considerations

- **Mobile**: Single column layout, delete buttons always visible, simplified action buttons
- **Tablet**: Two column layout, hover-based delete buttons, full action buttons
- **Desktop**: Three column layout with side-by-side preview, hover interactions

### Performance Optimizations

1. **Lazy Loading**: Avatar images loaded with `loading="lazy"` attribute
2. **Memoization**: Preview components memoized with React.memo
3. **Debouncing**: Name edit saves debounced to reduce API calls
4. **Optimistic Updates**: UI updates immediately with rollback on failure
5. **Query Caching**: TanStack Query caches avatar lists with smart invalidation

### Accessibility

- Keyboard navigation for avatar grid
- ARIA labels for all interactive elements
- Focus management for dialogs
- Screen reader announcements for state changes
- High contrast mode support

### Migration Strategy

1. **Phase 1**: Extend SpriteListTab with new props (backward compatible)
2. **Phase 2**: Add multi-select and batch operations
3. **Phase 3**: Replace CharacterAvatar usage with enhanced SpriteListTab
4. **Phase 4**: Remove deprecated CharacterAvatar component
