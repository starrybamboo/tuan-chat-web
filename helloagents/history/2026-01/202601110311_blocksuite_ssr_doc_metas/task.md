# 任务清单: blocksuite_ssr_doc_metas

Ŀ¼: `helloagents/plan/202601110311_blocksuite_ssr_doc_metas/`

---

## 1. SSR 安全改造
- [√] 1.1 移除 `app/components/chat/chatPage.tsx` 对 `spaceDocCollectionRegistry` 的静态导入，改为 `useEffect` 内动态 `import()`，避免 SSR 评估阶段触发 `lit-html`

## 2. 验证
- [√] 2.1 执行 `pnpm build`，确认不再出现 `document is not defined`
- [√] 2.2 执行 `pnpm typecheck`，确认类型检查通过

## 3. 文档与记录
- [√] 3.1 更新知识库：记录“Blocksuite 相关模块禁止在 SSR 入口静态 import”的约束与本次修复点
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 记录本次修复
- [√] 3.3 迁移方案包至 `helloagents/history/2026-01/`

