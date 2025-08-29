# Design Document

## Overview

This design outlines the refactoring approach to replace the custom `GameRule` type with the backend-generated `Rule` type from the API models. The refactoring will eliminate duplicate type definitions, remove manual data transformations, and ensure type consistency between frontend and backend.

The current architecture has two duplicate `GameRule` type definitions (in `app/components/newCharacter/types.ts` and `app/types/characterTypes.ts`) and multiple API hooks that perform manual data transformation from the backend `Rule` type to the frontend `GameRule` type. This creates maintenance overhead and potential inconsistencies.

## Architecture

### Current Architecture Issues

1. **Duplicate Type Definitions**: `GameRule` is defined in two separate files with slightly different structures
2. **Manual Data Transformation**: API hooks transform backend `Rule` data to frontend `GameRule` format
3. **Field Name Mismatches**: Frontend uses `performance`/`numerical` while backend uses `actTemplate`/`abilityDefault`
4. **Type Inconsistency**: Different optional/required field patterns between frontend and backend types

### Target Architecture

1. **Single Source of Truth**: Use only the generated `Rule` type from `api/models/Rule.ts`
2. **Direct Type Usage**: Components work directly with the `Rule` type structure
3. **Eliminated Transformations**: API hooks return `Rule` data directly without transformation
4. **Consistent Field Names**: All components use backend field names (`actTemplate`, `abilityDefault`)

## Components and Interfaces

### Type System Changes

#### Remove Custom Types
- Delete `GameRule` from `app/components/newCharacter/types.ts`
- Delete `GameRule` from `app/types/characterTypes.ts`
- Replace `PerformanceFields` with direct usage of `Record<string, string>` (matching `actTemplate`)
- Replace `NumericalConstraints` with direct usage of `Record<string, Record<string, any>>` (matching `abilityDefault`)
- Remove `NumericalConstraint` type as it's no longer needed

#### Import Backend Types
- Import `Rule` from `api/models/Rule.ts` in all affected components
- Import `ApiResultRule` where API response handling is needed

### API Hooks Refactoring

#### Current Transformation Pattern
```typescript
// Current - transforms backend to frontend
return {
  id: res.data.ruleId || 0,
  name: res.data.ruleName || "",
  description: res.data.ruleDescription || "",
  performance: res.data.actTemplate || {},
  numerical: res.data.abilityDefault || {},
};
```

#### Target Direct Usage Pattern
```typescript
// Target - return backend type directly
if (res.success && res.data) {
  return res.data; // Rule type
}
```

### Component Updates

#### ExpansionModule.tsx
- Change `GameRule` imports to `Rule`
- Update field access from `performance` to `actTemplate`
- Update field access from `numerical` to `abilityDefault`
- Update state type from `GameRule | null` to `Rule | null`

#### RulesSection.tsx
- Change `GameRule[]` to `Rule[]` for rules state
- Update component props to use `Rule` type
- Update field access patterns

#### PerformanceEditor.tsx
- Update to work with `actTemplate` field instead of `performance`
- Replace `PerformanceFields` type with `Record<string, string>`
- Update prop interfaces to use the backend type structure

#### NumericalEditor.tsx
- Update to work with `abilityDefault` field instead of `numerical`
- Replace `NumericalConstraints` and `ExtendedNumericalConstraints` with `Record<string, Record<string, any>>`
- Update prop interfaces and internal logic to use the backend type structure

## Data Models

### Backend Rule Type Structure
```typescript
export type Rule = {
    ruleId?: number;
    ruleName?: string;
    ruleDescription?: string;
    actTemplate?: Record<string, string>;
    abilityDefault?: Record<string, Record<string, any>>;
};
```

### Field Mapping
| Frontend (Old) | Backend (New) | Type |
|----------------|---------------|------|
| `id` | `ruleId` | `number` |
| `name` | `ruleName` | `string` |
| `description` | `ruleDescription` | `string` |
| `performance` | `actTemplate` | `Record<string, string>` |
| `numerical` | `abilityDefault` | `Record<string, Record<string, any>>` |

### Type Compatibility Considerations

#### Optional vs Required Fields
- Backend `Rule` type has all optional fields (`ruleId?`, `ruleName?`, etc.)
- Components must handle undefined values appropriately
- Use nullish coalescing (`??`) and optional chaining (`?.`) for safe access

#### Supporting Type Replacements
- Replace all `PerformanceFields` usage with `Record<string, string>`
- Replace all `NumericalConstraints` usage with `Record<string, Record<string, any>>`
- Update component interfaces and prop types accordingly
- Remove unused type definitions after migration

#### Nested Structure Differences
- `abilityDefault` has deeper nesting than the previous `numerical` field
- Components accessing nested data need to be updated accordingly
- Ensure type safety when accessing nested properties

## Error Handling

### Type Safety Improvements
- Remove manual type casting and transformation logic
- Rely on TypeScript's type checking for the generated `Rule` type
- Add proper null/undefined checks for optional fields

### Runtime Safety
- Add validation for required fields in components that expect them
- Provide fallback values for optional fields where needed
- Maintain existing error handling patterns in API hooks

### Migration Safety
- Ensure all field access is updated consistently
- Add temporary logging to verify data structure during development
- Test all affected components thoroughly

## Testing Strategy

### Unit Testing Approach
1. **Type Testing**: Verify components accept `Rule` type correctly
2. **Field Access Testing**: Test all field access patterns with new field names
3. **API Hook Testing**: Verify hooks return `Rule` type without transformation
4. **Component Integration Testing**: Test data flow between components

### Test Cases
1. **Successful Data Loading**: Components receive and display `Rule` data correctly
2. **Optional Field Handling**: Components handle undefined optional fields gracefully
3. **Field Access**: All `actTemplate` and `abilityDefault` access works correctly
4. **State Management**: Component state updates work with `Rule` type
5. **API Integration**: Hooks return proper `Rule` data structure

### Regression Testing
- Verify all existing functionality works after refactoring
- Test rule selection, performance editing, and numerical editing
- Ensure data persistence and API communication remain intact

## Implementation Phases

### Phase 1: Type System Updates
1. Remove duplicate `GameRule` type definitions
2. Remove supporting types (`PerformanceFields`, `NumericalConstraints`, `NumericalConstraint`)
3. Update import statements to use `Rule` type and direct Record types
4. Fix immediate TypeScript compilation errors

### Phase 2: API Hook Refactoring
1. Remove data transformation logic from hooks
2. Update return types to use `Rule` directly
3. Update query keys and caching logic if needed

### Phase 3: Component Updates
1. Update field access patterns in all components
2. Update state management to use `Rule` type
3. Update prop types and interfaces

### Phase 4: Testing and Validation
1. Run comprehensive tests on all affected components
2. Verify data flow and API integration
3. Test edge cases and error scenarios
4. Performance testing to ensure no regressions