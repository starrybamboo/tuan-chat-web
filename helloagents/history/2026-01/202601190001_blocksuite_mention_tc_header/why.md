# Change Proposal: Blocksuite @ doc titles use tc_header

## Background
Linked-doc/@ menu and embedded synced-doc header currently use Blocksuite native doc titles. In TuanChat, doc titles must come from tc_header for all doc types, with no fallback to native titles.

## Change Summary
1. Use tc_header as the only source of doc titles for linked-doc menu and embed headers.
2. Sync workspace meta titles from tc_header and clear any native fallback values.
3. Refresh existing references by updating meta when tc_header changes.

## Impact Scope
- Modules: blocksuite runtime, blocksuite embedded editor
- Files: app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts, app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts
- API: none
- Data: none

## Core Scenarios

### Requirement Use tc_header title for at-menu and embed cards Scenario Mention menu lists tc_header title
Given a workspace with docs that have tc_header.title
- When the user types "@" and opens the linked-doc menu
- Then each doc title uses tc_header.title and no native title fallback is shown

### Requirement Use tc_header title for at-menu and embed cards Scenario Embed synced-doc header shows tc_header title
Given an inserted synced-doc embed card
- When the card header renders in page or edgeless mode
- Then the header title uses tc_header.title only

### Requirement Use tc_header title for at-menu and embed cards Scenario Existing references refresh after tc_header change
Given existing references created before this change
- When tc_header.title is updated
- Then linked-doc menu and embed card titles reflect the new tc_header value

### Requirement Use tc_header title for at-menu and embed cards Scenario Missing tc_header shows empty title
Given a doc without tc_header.title
- When the linked-doc menu or embed header renders
- Then the title is empty and does not fall back to the native title

## Risk Assessment
- Risk: Docs without tc_header show empty titles.
  - Mitigation: Ensure tc_header is populated for business docs; keep docs discoverable even with empty titles.
- Risk: Title hydration loads docs to read tc_header.
  - Mitigation: Keep lazy hydration and avoid extra writes.
