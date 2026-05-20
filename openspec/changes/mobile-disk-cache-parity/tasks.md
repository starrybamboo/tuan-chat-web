## 1. Local Cache Foundation

- [x] 1.1 Add a shared mobile SQLite cache module for `tuanchat-local.db` access, migrations, and typed drivers.
- [x] 1.2 Add `mobile_query_snapshots` storage with `key`, `user_id`, `scope`, `payload_json`, `updated_at`, and `expires_at`.
- [x] 1.3 Implement `readSnapshot`, `writeSnapshot`, prefix removal, expired cleanup, and user-scoped cleanup helpers.
- [x] 1.4 Add a mobile non-sensitive KV storage helper and migrate workspace selection away from SecureStore.
- [x] 1.5 Add tests for snapshot TTL, user isolation, invalid JSON recovery, and cleanup behavior.

## 2. Room Message Persistence

- [x] 2.1 Extend mobile room message cache access to expose `getMaxSyncId` and incremental read/write helpers.
- [x] 2.2 Change `useRoomMessagesQuery` to read SQLite first, then use `getHistoryMessages({ syncId: maxSyncId + 1 })` when cache exists.
- [x] 2.3 Keep full room message fetch only for empty cache or explicit repair paths.
- [x] 2.4 Persist active-room WebSocket messages and gap-repair messages to SQLite.
- [x] 2.5 Add tests for cached room hydration, incremental sync, empty-cache fallback, tombstone handling, and WebSocket persistence.

## 3. Direct Message Persistence

- [x] 3.1 Add a direct message SQLite repository keyed by `current_user_id`, `contact_id`, `message_id`, and `sync_id`.
- [x] 3.2 Implement direct message read, upsert, mark recalled, mark read-line, contact slice, and user cleanup helpers.
- [x] 3.3 Change `useDmInboxQuery` to hydrate from SQLite before network data and write merged inbox results after success.
- [x] 3.4 Persist direct messages received through WebSocket to SQLite.
- [x] 3.5 Update direct send, recall, and read-position flows so successful mutations update both React Query and disk cache.
- [x] 3.6 Add tests for direct conversation restart recovery, duplicate merge, recall persistence, and multi-user isolation.

## 4. Query Snapshot Adoption

- [x] 4.1 Add a small hook/helper for whitelisted query snapshot hydration and writeback.
- [x] 4.2 Persist active spaces, rooms by space, message sessions, and unread summaries.
- [x] 4.3 Persist friends, friend requests, blacklist, and direct inbox metadata.
- [x] 4.4 Persist my roles, room roles, role avatar lists, members, and user stickers.
- [x] 4.5 Persist room extra, room dnd map, role abilities, and rule details where used by mobile panels.
- [x] 4.6 Persist notifications first page with a bounded item count and keep unread count network/WS authoritative.
- [x] 4.7 Add targeted tests for snapshot hydration, mutation invalidation/writeback, and stale data refresh.

## 5. Media File Cache

- [x] 5.1 Add `mobile-media-file-cache` for audio, video, and document files with in-flight deduplication.
- [x] 5.2 Add size limits, TTL/LRU cleanup, partial-download cleanup, and remote URL fallback.
- [x] 5.3 Update `MobileMessageMediaPreview` to resolve local media files before opening audio, video, or documents.
- [x] 5.4 Verify platform handling for iOS and Android file/content URI opening and document sharing.
- [x] 5.5 Add tests for cache hits, cache misses, failed downloads, cleanup, and fallback behavior.

## 6. Validation

- [x] 6.1 Run `pnpm --filter @tuanchat/mobile typecheck`.
- [x] 6.2 Run targeted Vitest suites for mobile cache, room message cache, direct message cache, and query snapshot helpers.
- [x] 6.3 Run `pnpm test` if shared packages or cross-platform query/domain behavior changed.
- [ ] 6.4 Manually verify mobile cold start, room switching, direct chat reopen, avatar reuse, and media open flows.
