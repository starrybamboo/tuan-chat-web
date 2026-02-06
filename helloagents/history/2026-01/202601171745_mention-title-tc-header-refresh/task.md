# 任务清单: @ 标题刷新与 inline 标题同步

Ŀ¼: `helloagents/plan/202601171745_mention-title-tc-header-refresh/`

---

## 1. blocksuite runtime

- [√] 1.1 在 `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` 中让 `meta.docMetaUpdated` 驱动 `slots.docListUpdated`，确保 `DocDisplayMetaProvider` 刷新
- [√] 1.2 在 `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` 中从 subdoc 读取 `tc_header.title` 并写回 `meta.title`，确保 @ 菜单与 inline 一致，依赖任务1.1

## 2. 安全检查

- [√] 2.1 检查是否会因读取 `tc_header` 产生隐式写入（避免 `getMap` 创建新类型）

## 3. 文档更新（知识库）

- [√] 3.1 更新 `helloagents/wiki/modules/app.md`：补充“标题刷新触发机制”
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

## 4. 验证

- [√] 4.1 执行 `pnpm run typecheck`
