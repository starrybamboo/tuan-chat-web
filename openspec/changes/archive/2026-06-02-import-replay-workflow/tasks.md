## 1. Contracts

- [x] 1.1 Define TypeScript types for authoring batch, source metadata, role upsert, avatar upsert, media upsert, message write, inspect report, cleanup result, and export readiness
- [x] 1.2 Define CLI/API request and response contracts for batch start, role upsert, avatar upsert, media upsert, message batch write, inspect, cleanup, and WebGAL export
- [x] 1.3 Add input hash and source key helpers for duplicate batch detection
- [x] 1.4 Add contract tests for malformed requests, unsupported source metadata, duplicate batches, and structured errors

## 2. Batch Layer

- [x] 2.1 Implement authoring batch creation with target room, source kind, source key, input hash, status, and aggregate stats
- [x] 2.2 Implement duplicate detection for target room + source key + input hash with explicit force override
- [x] 2.3 Implement batch status transitions for pending, committed, failed, and cleaned
- [x] 2.4 Implement cleanup for batch-created draft resources without deleting reused existing resources
- [x] 2.5 Add tests for batch creation, duplicate detection, force override, status transitions, and cleanup

## 3. Resource Primitives

- [x] 3.1 Implement role upsert by source key and normalized name with existing name collision policy
- [x] 3.2 Implement avatar upsert by role id, source asset key, and file hash
- [x] 3.3 Implement media upsert for local files, existing media ids, and resolvable remote audio resources
- [x] 3.4 Implement unresolved media reference recording for BGM or other media that cannot be resolved yet
- [x] 3.5 Add tests for role reuse/create, avatar reuse/upload, media reuse/upload, unresolved media, and batch resource accounting

## 4. Message Primitive

- [x] 4.1 Implement batch message write to room message stream using existing message patch/send semantics
- [x] 4.2 Support dialog messages with role id, avatar id, content, custom display name, and source metadata
- [x] 4.3 Support narration messages without inventing a character role
- [x] 4.4 Support historical dice messages that preserve roll text, result, and associated options without rerolling
- [x] 4.5 Support BGM event messages with resolved media id or unresolved media reference
- [x] 4.6 Add tests for ordering, role/avatar ids, narration behavior, dice preservation, BGM event state, and source metadata

## 5. Inspect And Export

- [x] 5.1 Implement inspect output for batch, role, avatar, media, message, unresolved item, source metadata, and aggregate statistics
- [x] 5.2 Implement WebGAL readiness inspection from generic message/media semantics
- [x] 5.3 Update WebGAL export mapping to use per-message avatar ids from generic authored messages
- [x] 5.4 Update WebGAL export mapping for historical dice messages and authored BGM events
- [x] 5.5 Add tests for inspect reports, WebGAL readiness, avatar export, dice export, resolved BGM export, and unresolved BGM reporting

## 6. Agent Workflow Verification

- [x] 6.1 Generate or reuse the 咕噜噜 1-62 floor sample package as an agent-side input fixture
- [x] 6.2 Use generic primitives to upsert roles, avatars, media, and messages for the sample into a test room
- [x] 6.3 Verify inspect output matches package stats and reports unresolved BGM clearly
- [x] 6.4 Export the authored room to WebGAL and verify avatar switching, dice text, narration, and BGM reporting
- [x] 6.5 Run `pnpm test` or focused Vitest suites before pushing implementation changes
