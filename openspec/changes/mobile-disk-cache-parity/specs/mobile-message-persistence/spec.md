## ADDED Requirements

### Requirement: Room messages restore from SQLite before network sync
The mobile app SHALL read cached room messages from SQLite before completing network synchronization for the selected room.

#### Scenario: Enter cached room
- **WHEN** a user enters a room that has cached messages
- **THEN** the app SHALL display the cached messages while refreshing newer messages from the server

### Requirement: Room messages sync incrementally
The mobile app SHALL use the local maximum room message sync id to request only newer room messages when cached data exists.

#### Scenario: Cached room has max sync id
- **WHEN** cached room messages include a maximum `syncId`
- **THEN** the app SHALL request history from `maxSyncId + 1` instead of calling the full room message endpoint

### Requirement: Room WebSocket messages persist
The mobile app SHALL persist room messages received through WebSocket, including gap-repair messages, to the room message SQLite cache.

#### Scenario: Receive live room message
- **WHEN** a room message arrives through WebSocket for the active room
- **THEN** the app SHALL update both React Query state and the SQLite room message cache

### Requirement: Direct messages persist to SQLite
The mobile app SHALL persist direct messages by current user, contact, message id, sync id, status, payload JSON, and updated timestamp.

#### Scenario: Open direct conversation after restart
- **WHEN** a user opens a direct conversation after restarting the app
- **THEN** the app SHALL display locally cached direct messages before the inbox network request completes

### Requirement: Direct message mutations update disk cache
The mobile app SHALL update the direct message disk cache after direct message send, recall, read-position, and WebSocket receive events.

#### Scenario: Direct message recalled
- **WHEN** a direct message is recalled successfully or recall arrives from synchronization
- **THEN** the cached direct message SHALL be marked recalled so it is not restored as an active message after restart

### Requirement: Message merge rules stay consistent
The mobile app SHALL reuse existing domain/query merge semantics when combining cached, network, optimistic, and WebSocket messages.

#### Scenario: Duplicate direct messages
- **WHEN** the same direct message exists in both disk cache and network response
- **THEN** the app SHALL render one merged message using the canonical message id and latest status
