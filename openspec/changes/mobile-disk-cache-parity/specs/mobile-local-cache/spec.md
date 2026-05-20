## ADDED Requirements

### Requirement: Query snapshots persist selected mobile data
The mobile app SHALL persist whitelisted non-sensitive query results to local disk with a stable key, user scope, payload JSON, update timestamp, and expiration timestamp.

#### Scenario: Cold start restores cached query data
- **WHEN** the mobile app starts after previously loading a whitelisted query
- **THEN** the app SHALL restore the cached query data from disk before the network request completes

#### Scenario: Network refresh updates snapshot
- **WHEN** a whitelisted query succeeds with newer network data
- **THEN** the app SHALL write the normalized payload to disk and update its timestamps

### Requirement: User scoped cache isolation
The mobile app SHALL isolate user-scoped cached data by authenticated user id and SHALL clear or ignore data that belongs to a different user.

#### Scenario: User switches account
- **WHEN** a different user signs in on the same device
- **THEN** the app SHALL NOT display the previous user's private cached spaces, rooms, messages, notifications, friends, roles, or sessions

### Requirement: Non-sensitive KV storage
The mobile app SHALL store non-sensitive high-frequency preferences in a local KV store instead of SecureStore, while keeping authentication secrets in SecureStore.

#### Scenario: Workspace selection persists
- **WHEN** a user selects a space and room
- **THEN** the selection SHALL be recoverable after app restart without storing ordinary preference JSON in SecureStore

### Requirement: Media file cache uses controlled disk storage
The mobile app SHALL cache media files on disk with bounded size, TTL or LRU cleanup, in-flight request deduplication, and remote URL fallback on failure.

#### Scenario: Open cached media
- **WHEN** a user opens a previously cached audio, video, or document attachment
- **THEN** the app SHALL use the local file URI when available and valid

#### Scenario: Media cache miss
- **WHEN** a media file is not cached or local resolution fails
- **THEN** the app SHALL open or fetch the remote URL without blocking the message UI permanently

### Requirement: Cache cleanup is available
The mobile app SHALL provide cleanup operations for expired snapshots, user-scoped data, and oversized media cache entries.

#### Scenario: Expired snapshot cleanup
- **WHEN** cached snapshots are past their expiration timestamp
- **THEN** the cleanup operation SHALL remove them without deleting valid current-user cache
