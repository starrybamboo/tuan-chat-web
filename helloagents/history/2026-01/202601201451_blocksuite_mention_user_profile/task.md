# 任务清单: Blocksuite `@` 用户候选展示头像与名称

目录: `helloagents/plan/202601201451_blocksuite_mention_user_profile/`

---

## 1. blocksuite（集成模块）
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中让 `@` 弹窗用户候选使用 `createTuanChatUserService()` 拉取 `/user/info`，展示头像与用户名（不再仅显示 userId）

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/blocksuite.md` 记录用户候选信息来源
- [√] 2.2 更新 `helloagents/CHANGELOG.md`（Unreleased）补充修复说明

## 3. 测试
- [√] 3.1 执行 TypeScript 类型检查（`pnpm -C tuan-chat-web typecheck` 或等价命令）

## 4. 集成与归档
- [√] 4.1 迁移方案包至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
- [√] 4.2 自动集成 session 分支到集成分支并更新测试分支
