## ADDED Requirements

### Requirement: User can search for other users by ID or username
The mobile AddFriendTab SHALL allow users to search for other users by entering either a numeric user ID or a username string. The system SHALL display the found user's avatar, username, and user ID in the search result area.

#### Scenario: Search by numeric user ID
- **WHEN** user enters a numeric string and taps "查询状态"
- **THEN** the system queries user info by ID and displays the user's avatar, username, and ID

#### Scenario: Search by username
- **WHEN** user enters a non-numeric string and taps "查询状态"
- **THEN** the system queries user info by username and displays the user's avatar, username, and ID

#### Scenario: User not found
- **WHEN** user enters an ID or username that does not exist
- **THEN** the system displays an alert with "未找到用户" message

### Requirement: Display friend relationship status after search
The system SHALL check and display the current friend relationship status (已是好友, 已拉黑, 待处理, 非好友) after a successful user search.

#### Scenario: Target is already a friend
- **WHEN** search result shows a user who is already a friend
- **THEN** the status badge shows "已是好友" and the send request button is hidden

#### Scenario: Target is blocked
- **WHEN** search result shows a user who is blocked
- **THEN** the status badge shows "已拉黑" and the send request button is hidden with explanation text

#### Scenario: Request already pending
- **WHEN** search result shows a user with a pending request
- **THEN** the status badge shows "待处理" and the send request button shows "已申请" in disabled state

### Requirement: Send friend request with verification message
The system SHALL allow sending a friend request with a mandatory verification message when the target user is not yet a friend and not blocked.

#### Scenario: Successful friend request send
- **WHEN** user fills in verification message and taps "发送好友请求"
- **THEN** the system sends the request, shows a success alert, and clears the form

#### Scenario: Empty verification message
- **WHEN** user taps "发送好友请求" without filling in verification message
- **THEN** the system shows an error alert requiring verification message

#### Scenario: Send request fails
- **WHEN** the API call to send friend request fails
- **THEN** the system shows an error alert with the failure reason

### Requirement: Optimistic removal of handled friend requests
When a friend request is accepted or rejected, the system SHALL immediately remove it from the pending requests list without waiting for a server re-fetch.

#### Scenario: Accept request removes it from list
- **WHEN** user accepts a friend request
- **THEN** the request disappears from the pending list immediately via optimistic update

#### Scenario: Reject request removes it from list
- **WHEN** user rejects a friend request
- **THEN** the request disappears from the pending list immediately via optimistic update

#### Scenario: Rollback on failure
- **WHEN** the accept/reject API call fails
- **THEN** the request reappears in the pending list and an error is shown
