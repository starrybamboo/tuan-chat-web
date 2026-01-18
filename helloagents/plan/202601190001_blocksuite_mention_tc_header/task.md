# Task List: Blocksuite @ doc titles use tc_header

Directory: `helloagents/plan/202601190001_blocksuite_mention_tc_header/`

---

## 1. Blocksuite runtime title source
- [ ] 1.1 Update `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` to hydrate meta titles from tc_header only and clear native fallbacks, verify why.md#requirement-use-tc_header-title-for-at-menu-and-embed-cards-scenario-mention-menu-lists-tc_header-title
- [ ] 1.2 Update `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` to sync meta on doc load using tc_header only, verify why.md#requirement-use-tc_header-title-for-at-menu-and-embed-cards-scenario-embed-synced-doc-header-shows-tc_header-title
- [ ] 1.3 Update `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` to refresh existing references when tc_header changes, verify why.md#requirement-use-tc_header-title-for-at-menu-and-embed-cards-scenario-existing-references-refresh-after-tc_header-change
- [ ] 1.4 Ensure missing tc_header clears title in meta, verify why.md#requirement-use-tc_header-title-for-at-menu-and-embed-cards-scenario-missing-tc_header-shows-empty-title

## 2. Blocksuite embedded editor verification
- [ ] 2.1 Review `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` to confirm linked-doc menu and embed headers read workspace meta titles, verify why.md#requirement-use-tc_header-title-for-at-menu-and-embed-cards-scenario-embed-synced-doc-header-shows-tc_header-title
- [ ] 2.2 Adjust if needed to avoid any native title fallback in menu or header rendering, verify why.md#requirement-use-tc_header-title-for-at-menu-and-embed-cards-scenario-mention-menu-lists-tc_header-title

## 3. Security check
- [ ] 3.1 Execute security check (G9: input validation, sensitive data handling, access control, EHRB risks)

## 4. Documentation
- [ ] 4.1 Update `helloagents/wiki/modules/blocksuite.md` with tc_header-only title rule
- [ ] 4.2 Update `helloagents/CHANGELOG.md`

## 5. Testing
- [ ] 5.1 Manual test: @ menu lists tc_header titles; missing tc_header shows empty titles
- [ ] 5.2 Manual test: embed synced-doc header shows tc_header title; updates after tc_header changes
