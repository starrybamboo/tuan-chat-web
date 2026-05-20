## ADDED Requirements

### Requirement: State panel displays role avatars
Each role entry in the state panel SHALL display the role's avatar image alongside the role name, providing visual identification consistent with the web version.

#### Scenario: Role with avatar shows image
- **WHEN** a role has an avatar configured
- **THEN** the state panel displays a circular avatar image next to the role name

#### Scenario: Role without avatar shows fallback
- **WHEN** a role has no avatar configured
- **THEN** the state panel displays a placeholder icon or the first character of the role name

### Requirement: Primary stats use semantic color coding
The state panel SHALL display primary stats (HP, MP, SAN, SP) with distinct semantic colors: HP in red, MP in blue, SAN in amber/yellow, SP in green. Other stats SHALL use a neutral color.

#### Scenario: HP stat displays in red
- **WHEN** a role has an HP state variable
- **THEN** the HP pill/badge renders with a red color scheme

#### Scenario: Unknown stat uses neutral color
- **WHEN** a role has a state variable with a key not in the primary set (HP/MP/SAN/SP)
- **THEN** the stat pill renders with the default neutral/gray color

### Requirement: Stats display with base and current values
The state panel SHALL display stat values showing both the current (derived) value and the base/max value when they differ, formatted as "current/max" (e.g., "HP 45/100"). When current equals base, only the single value is shown.

#### Scenario: Stat with modified value
- **WHEN** a role's HP base value is 100 and derived value is 45
- **THEN** the display shows "HP 45/100"

#### Scenario: Stat with unmodified value
- **WHEN** a role's MP base value equals derived value (both 50)
- **THEN** the display shows "MP 50"

### Requirement: Current role is highlighted
The state panel SHALL visually distinguish the current active role (the role whose turn it is) from other roles, using a highlight badge or border accent.

#### Scenario: Current role shows highlight
- **WHEN** the current role ID matches a role in the state panel
- **THEN** that role's card displays a "当前" badge and/or an accent border color

#### Scenario: Other roles show normal styling
- **WHEN** a role is not the current active role
- **THEN** that role's card displays with standard styling without highlight

### Requirement: Roles without state are grouped separately
Roles that have no state variables and no active status effects SHALL be displayed in a separate section at the bottom of the panel, visually distinct from roles with active state data.

#### Scenario: Role with no state data
- **WHEN** a role has no state variables and no active status effects
- **THEN** it appears in a "无状态数据" section at the bottom with muted styling

#### Scenario: Role gains state data
- **WHEN** a role that previously had no state receives a state event
- **THEN** it moves from the "无状态数据" section to the main role list

### Requirement: Ability sync loading indicator
The state panel SHALL display a loading indicator when role ability data is being synchronized, informing the user that displayed values may be incomplete.

#### Scenario: Abilities loading
- **WHEN** role ability data is being fetched/synchronized
- **THEN** a loading indicator with text "正在同步角色基础变量…" is displayed

#### Scenario: Abilities loaded
- **WHEN** role ability data has finished loading
- **THEN** the loading indicator is hidden and full state data is displayed
