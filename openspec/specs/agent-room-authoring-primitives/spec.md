# agent-room-authoring-primitives Specification

## Purpose
TBD - created by archiving change import-replay-workflow. Update Purpose after archive.
## Requirements
### Requirement: Agent-facing authoring batch

The system SHALL provide CLI/API primitives for AI agents to create, inspect, and clean up room authoring batches.

#### Scenario: Agent starts an authoring batch

- **WHEN** an AI agent starts a room authoring batch with target room id, source kind, source key, and input hash
- **THEN** the system returns a structured batch id and records the batch as pending

#### Scenario: Duplicate batch is detected

- **WHEN** an AI agent starts a batch with the same target room, source key, and input hash as an existing committed batch
- **THEN** the system rejects the duplicate unless the agent passes an explicit force flag

#### Scenario: Agent cleans up pending batch

- **WHEN** an AI agent calls cleanup for a pending or failed authoring batch
- **THEN** the system cleans resources created only for that batch without deleting reused existing resources

### Requirement: Role authoring primitive

The system SHALL allow AI agents to create or reuse room roles through CLI/API.

#### Scenario: Existing role is reused

- **WHEN** an AI agent upserts a role whose source key or normalized name maps to an existing room role
- **THEN** the system returns the existing role id and records the reuse in the authoring batch

#### Scenario: New role is created

- **WHEN** an AI agent upserts a role that has no matching room role
- **THEN** the system creates a role, handles name collisions with the existing role naming policy, and returns the new role id

### Requirement: Avatar authoring primitive

The system SHALL allow AI agents to upload or reuse role avatars through CLI/API.

#### Scenario: Existing avatar is reused

- **WHEN** an AI agent upserts an avatar with a file hash or source asset key that already exists for the target role
- **THEN** the system returns the existing avatar id and records the reuse in the authoring batch

#### Scenario: New avatar is uploaded

- **WHEN** an AI agent upserts an avatar file that has no matching target role avatar
- **THEN** the system uploads the avatar, associates it with the target role, and returns the new avatar id

### Requirement: Media authoring primitive

The system SHALL allow AI agents to upload or reuse media assets, including BGM, through CLI/API.

#### Scenario: Existing media is reused

- **WHEN** an AI agent upserts media with a file hash, source key, or existing media id that maps to an available media asset
- **THEN** the system returns the media id and records the reuse in the authoring batch

#### Scenario: New BGM media is uploaded

- **WHEN** an AI agent upserts a resolvable BGM file or remote audio resource
- **THEN** the system uploads the media, marks it usable for BGM, and returns the media id

#### Scenario: Unresolved media is recorded

- **WHEN** an AI agent records a BGM or media reference that cannot be resolved yet
- **THEN** the system records an unresolved media reference that can still be attached to messages and reported by inspect/export

### Requirement: Message stream authoring primitive

The system SHALL allow AI agents to batch write room message stream entries through CLI/API.

#### Scenario: Agent writes dialog messages

- **WHEN** an AI agent writes a dialog message with content, role id, avatar id, and source metadata
- **THEN** the system appends the message to the room message stream and preserves the role, avatar, content, and source metadata

#### Scenario: Agent writes narration messages

- **WHEN** an AI agent writes a narration message without a character speaker
- **THEN** the system appends it using the room's narration or spectator/system message semantics without inventing a character role

#### Scenario: Agent writes historical dice messages

- **WHEN** an AI agent writes a dice message with historical roll text, result, and associated options
- **THEN** the system preserves the historical dice text and options without rolling again

#### Scenario: Agent writes BGM events

- **WHEN** an AI agent writes a BGM event with resolved media id or unresolved media reference
- **THEN** the system stores the BGM event in message stream semantics that room playback and WebGAL export can understand

### Requirement: Source metadata

The system SHALL retain generic source metadata sufficient for audit, troubleshooting, and export.

#### Scenario: Batch source metadata is recorded

- **WHEN** an AI agent creates or commits an authoring batch
- **THEN** the system records source kind, source key, input hash, target room, agent identity when available, timestamps, and aggregate stats

#### Scenario: Message source metadata is recorded

- **WHEN** an AI agent writes a message with source metadata
- **THEN** the system records source segment id, source event index, original speaker, original asset path, and original media name when provided

### Requirement: Authoring inspection

The system SHALL provide structured inspection output for AI agents.

#### Scenario: Agent inspects batch

- **WHEN** an AI agent calls inspect for an authoring batch
- **THEN** the system returns structured role, avatar, media, message, unresolved item, source metadata, and aggregate statistics

#### Scenario: Agent inspects WebGAL readiness

- **WHEN** an AI agent calls inspect for WebGAL readiness
- **THEN** the system reports whether messages, avatars, dice events, BGM media, and unresolved media references can be exported

### Requirement: WebGAL export from primitives

The system SHALL export rooms authored through generic primitives without relying on replay-specific models.

#### Scenario: Dialog export uses message avatar

- **WHEN** WebGAL export processes a dialog message with a per-message avatar id
- **THEN** the exported script uses that avatar asset for the character line

#### Scenario: Dice export preserves authored dice text

- **WHEN** WebGAL export processes a historical dice message
- **THEN** the exported script displays the preserved dice result and associated options as authored text

#### Scenario: BGM export reports unresolved assets

- **WHEN** WebGAL export processes a BGM event with unresolved media
- **THEN** the export result reports the unresolved BGM while continuing to export other supported messages

