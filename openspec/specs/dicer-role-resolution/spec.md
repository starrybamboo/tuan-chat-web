# dicer-role-resolution Specification

## Purpose
Define how dice commands choose the dice maiden role that sends generated dice replies.

## Requirements
### Requirement: Dice commands SHALL resolve dice maiden roles by role, space, then default
When a dice command produces a dice maiden reply, the app SHALL resolve the reply role using the following priority order:

1. The current speaking role's bound dice maiden role (`role.extra.dicerRoleId`).
2. The active space's configured dice maiden role (`space.extra.dicerRoleId` or `space.dicerRoleId`).
3. The built-in default dice maiden role ID `2`.

The app SHALL NOT use the current user's private `user.extra.dicerRoleId` as a dice maiden fallback.

#### Scenario: Current role has a bound dice maiden
- **WHEN** the current speaking role has `extra.dicerRoleId` set to a valid dice maiden role
- **AND** the active space also has a configured dice maiden
- **THEN** dice maiden replies SHALL use the current role's bound dice maiden

#### Scenario: Current role has no bound dice maiden
- **WHEN** the current speaking role has no valid `extra.dicerRoleId`
- **AND** the active space has a configured dice maiden
- **THEN** dice maiden replies SHALL use the active space's configured dice maiden

#### Scenario: Neither role nor space has a dice maiden
- **WHEN** the current speaking role has no valid `extra.dicerRoleId`
- **AND** the active space has no valid dice maiden configuration
- **THEN** dice maiden replies SHALL use the built-in default dice maiden role ID `2`

#### Scenario: No current speaking role is selected
- **WHEN** the user sends a dice command as narration or without a selected role
- **THEN** role-bound dice maiden lookup SHALL be skipped
- **AND** dice maiden replies SHALL use the active space's configured dice maiden when present, otherwise the built-in default dice maiden role ID `2`

### Requirement: Dice maiden resolution SHALL validate role type
The selected dice maiden role ID SHALL only be used when the referenced role is a dice maiden role.

#### Scenario: Resolved role is a dice maiden
- **WHEN** the resolved role exists and has dice maiden type
- **THEN** dice maiden replies SHALL use that role ID

#### Scenario: Resolved role is not a dice maiden
- **WHEN** the resolved role ID points to a non-dice-maiden role or cannot be verified
- **THEN** dice maiden replies SHALL fall back to the built-in default dice maiden role ID `2`

### Requirement: Dice maiden resolution SHALL cache inputs, not final answers
The app MAY cache source data used to compute dice maiden resolution, such as space snapshots, role-bound dice maiden IDs, and role type checks, but SHALL NOT cache the final resolved dice maiden ID as an unconditional answer for a `(spaceId, currentRoleId)` pair.

#### Scenario: Space snapshot changes
- **WHEN** a fresh space snapshot with a different configured dice maiden is supplied
- **THEN** dice maiden resolution SHALL use the fresh snapshot for the current command
- **AND** it SHALL NOT return a stale final resolved role ID from a previous command

#### Scenario: Cached input data is available
- **WHEN** source input data required for resolution is cached and still valid
- **THEN** dice maiden resolution MAY reuse that input data
- **AND** it SHALL still recompute the priority order for the current command
