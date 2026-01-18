# Technical Design: Blocksuite @ doc titles use tc_header

## Technical Approach
### Core Tech
- Blocksuite runtime (workspace meta / DocDisplayMetaProvider)
- Yjs map tc_header on space docs

### Implementation Notes
- Update workspace meta hydration to read tc_header only.
- Remove native title fallback and business-doc special case.
- When tc_header is missing, clear meta title (empty string) to prevent stale native titles.
- On doc load, sync meta title from tc_header only (no tryReadNativeDocTitle).
- Ensure meta updates emit docListUpdated so linked-doc menu and embed headers refresh.

## Architecture
No architecture change.

## Security and Performance
- Security: No new data flow; do not store sensitive data.
- Performance: Keep lazy hydration; avoid unnecessary loads or meta updates.

## Testing and Rollout
- Manual: verify @ menu titles, embed card titles, tc_header updates, and missing tc_header behavior.
- Rollout: normal deploy; no data migration.
