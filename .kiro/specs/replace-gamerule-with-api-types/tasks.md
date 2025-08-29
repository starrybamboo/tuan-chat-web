# Implementation Plan

- [x] 1. Remove duplicate GameRule type definitions and supporting types






  - Delete `GameRule`, `PerformanceFields`, `NumericalConstraints`, and `NumericalConstraint` types from both type files
  - Clean up unused type imports across the codebase
  - _Requirements: 2.1, 2.2_

- [x] 2. Update API hooks to use Rule type directly







- [x] 2.1 Refactor ruleQueryHooks to return Rule type without transformation


  - Remove GameRule import and transformation logic in `useRuleDetailQuery`, `useRulePageMutation`, and `useRuleListQuery`
  - Update return types to use `Rule` directly from API responses
  - Update TypeScript types and remove manual data mapping
  - _Requirements: 1.1, 1.3_



- [x] 2.2 Update abilityQueryHooks to work with Rule field names






  - Modify `useAbilityByRuleAndRole` to return data with `actTemplate` and `abilityDefault` field names
  - Update the returned object structure to match Rule type expectations
  - _Requirements: 1.1, 1.3_

- [x] 3. Update component interfaces and prop types






- [x] 3.1 Update ExpansionModule component to use Rule type



  - Replace `GameRule` imports with `Rule` type from API models
  - Update state type from `GameRule | null` to `Rule | null`
  - Update field access from `performance`/`numerical` to `actTemplate`/`abilityDefault`
  - Update prop interfaces and callback signatures
  - _Requirements: 1.2, 3.1, 3.2_



- [x] 3.2 Update RulesSection component to use Rule type






  - Replace `GameRule[]` with `Rule[]` for rules state
  - Update component props and interfaces to use Rule type
  - Update field access patterns for rule display


  - _Requirements: 1.2, 3.1_

- [x] 3.3 Update GenerateByAI component to use Rule type





  - Replace `GameRule` type usage with `Rule` type
  - Update prop interfaces and callback signatures
  - Update field access patterns
  - _Requirements: 1.2, 3.1_

- [x] 4. Update editor components to work with backend field structure





- [x] 4.1 Update PerformanceEditor to use actTemplate structure


  - Replace `PerformanceFields` type with `Record<string, string>`
  - Update component interface to work with `actTemplate` field
  - Update prop types and internal logic
  - _Requirements: 1.2, 3.2_

- [x] 4.2 Update NumericalEditor to use abilityDefault structure


  - Replace `NumericalConstraints` and `ExtendedNumericalConstraints` with `Record<string, Record<string, any>>`
  - Update component interface to work with `abilityDefault` field
  - Update prop types and internal constraint handling logic
  - _Requirements: 1.2, 3.2_

- [x] 5. Fix field access patterns throughout components





- [x] 5.1 Update all rule.performance references to rule.actTemplate


  - Search and replace field access patterns in all affected components
  - Ensure proper null/undefined handling for optional fields
  - _Requirements: 3.2, 4.3_

- [x] 5.2 Update all rule.numerical references to rule.abilityDefault


  - Search and replace field access patterns in all affected components
  - Update nested object access patterns for the new structure
  - Ensure proper null/undefined handling for optional fields
  - _Requirements: 3.2, 4.3_

- [x] 5.3 Update rule ID field access from rule.id to rule.ruleId


  - Update all components that access rule ID
  - Ensure proper null/undefined handling for optional ruleId field
  - _Requirements: 3.2, 4.3_

- [ ] 6. Add proper null safety and error handling
- [ ] 6.1 Add null checks for optional Rule fields
  - Implement proper null/undefined checking for all optional Rule fields
  - Add fallback values where appropriate
  - Use nullish coalescing and optional chaining consistently
  - _Requirements: 4.3_

- [ ] 6.2 Update error handling in components
  - Ensure components handle undefined Rule data gracefully
  - Add proper loading states and error boundaries where needed
  - _Requirements: 4.3_

- [ ] 7. Write tests for the refactored components
- [ ] 7.1 Create unit tests for updated API hooks
  - Test that hooks return Rule type correctly
  - Test error handling and edge cases
  - Verify no data transformation occurs
  - _Requirements: 4.3_

- [ ] 7.2 Create component tests for Rule type usage
  - Test components render correctly with Rule data
  - Test field access patterns work with new structure
  - Test null/undefined handling
  - _Requirements: 3.1, 3.2, 4.3_

- [ ] 8. Clean up and validate the refactoring
- [ ] 8.1 Remove unused imports and type definitions
  - Clean up any remaining GameRule imports
  - Remove unused supporting type imports
  - Verify no dead code remains
  - _Requirements: 2.1, 2.2_

- [ ] 8.2 Run TypeScript compilation and fix any remaining errors
  - Ensure all TypeScript errors are resolved
  - Verify type safety throughout the application
  - Run full type checking on affected files
  - _Requirements: 3.3, 4.3_

- [ ] 8.3 Test all affected functionality end-to-end
  - Test rule selection and display
  - Test performance field editing
  - Test numerical constraint editing
  - Verify data persistence and API integration
  - _Requirements: 4.3_