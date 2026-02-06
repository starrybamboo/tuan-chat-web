# 任务清单: Blocksuite mention 移除 `@` ǰ׺

Ŀ¼: `helloagents/plan/202601201622_blocksuite_mention_remove_at/`

---

## 1. blocksuite
- [√] 1.1 在 `app/components/chat/infra/blocksuite/spec/tcMentionElement.client.ts` 中移除 mention 渲染的 `@` 前缀（头像+用户名已足够），并保持 embed 节点逻辑不变

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/blocksuite.md`
- [√] 2.2 更新 `helloagents/CHANGELOG.md`（Unreleased）

## 3. 验证
- [√] 3.1 执行 `pnpm -C tuan-chat-web typecheck`

## 4. 归档与集成
- [√] 4.1 迁移方案包至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
- [√] 4.2 自动集成 session 分支到集成分支并更新测试分支
