# Requirements Document

## Introduction

This feature involves refactoring the codebase to replace the custom `GameRule` type with the backend's `ApiResultRule` and `Rule` types. Currently, there are duplicate type definitions and manual data transformations between frontend and backend types, which creates maintenance overhead and potential inconsistencies. The goal is to eliminate the custom `GameRule` type and use the generated API types directly throughout the application.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to use the backend-generated API types directly instead of custom frontend types, so that I can maintain consistency between frontend and backend data structures and reduce code duplication.

#### Acceptance Criteria

1. WHEN the application loads rule data THEN the system SHALL use the `Rule` type from the API models instead of the custom `GameRule` type
2. WHEN components receive rule data THEN they SHALL work with the `Rule` type structure (ruleId, ruleName, ruleDescription, actTemplate, abilityDefault)
3. WHEN the system processes rule responses THEN it SHALL eliminate manual data transformation from backend structure to frontend structure

### Requirement 2

**User Story:** As a developer, I want to remove duplicate type definitions, so that I can maintain a single source of truth for data structures and avoid type inconsistencies.

#### Acceptance Criteria

1. WHEN reviewing the codebase THEN the system SHALL have only one definition of rule-related types
2. WHEN importing rule types THEN components SHALL import from the API models directory
3. WHEN the duplicate `GameRule` types are removed THEN all existing functionality SHALL continue to work without breaking changes

### Requirement 3

**User Story:** As a developer, I want to update all components that use GameRule, so that they work seamlessly with the new API types without losing functionality.

#### Acceptance Criteria

1. WHEN components like ExpansionModule, RulesSection, and GenerateByAI receive rule data THEN they SHALL handle the `Rule` type structure correctly
2. WHEN the PerformanceEditor and NumericalEditor components process rule data THEN they SHALL work with `actTemplate` and `abilityDefault` fields respectively
3. WHEN API hooks return rule data THEN they SHALL return the `Rule` type directly without transformation
4. WHEN the refactoring is complete THEN all TypeScript compilation errors SHALL be resolved

### Requirement 4

**User Story:** As a developer, I want to ensure backward compatibility during the transition, so that existing functionality remains intact while the types are being updated.

#### Acceptance Criteria

1. WHEN updating type definitions THEN the system SHALL maintain the same data access patterns where possible
2. WHEN field names change (e.g., `performance` to `actTemplate`, `numerical` to `abilityDefault`) THEN components SHALL be updated to use the correct field names
3. WHEN the refactoring is complete THEN all existing features SHALL work exactly as before
4. IF any breaking changes are necessary THEN they SHALL be clearly documented and minimal in scope