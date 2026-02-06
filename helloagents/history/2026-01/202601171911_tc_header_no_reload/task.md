# 任务清单: tcHeader 编辑不触发 blocksuite iframe 重载

Ŀ¼: `helloagents/plan/202601171911_tc_header_no_reload/`

---

## 1. 性能修复
- [√] 1.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 冻结同一 `(workspaceId, docId)` 下的 `tcHeader` fallback URL 参数，避免宿主实时同步标题/头像导致 iframe src 变化与重载

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/app.md`（记录该优化点）
- [√] 2.2 更新 `helloagents/CHANGELOG.md`
- [√] 2.3 更新 `helloagents/history/index.md`

## 3. 测试
- [√] 3.1 执行 `pnpm typecheck`
- [√] 3.2 执行 `pnpm lint`（允许存在既有 warning）
