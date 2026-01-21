# 任务清单: Blocksuite `@` 弹窗用户二级入口

目录: `helloagents/plan/202601201425_blocksuite_mention_user_submenu/`

---

## 1. blocksuite（集成模块）
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中调整 `getDocMenus()`：文档组优先、用户组默认折叠为二级入口，验证 why.md#需求-文档选择不被用户列表干扰-场景-输入--选择文档
- [√] 1.2 在同文件中保持用户选择插入链路不变（embed mention），验证 why.md#需求-仍可--用户-场景-展开用户列表并选择用户

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/blocksuite.md` 记录 `@` 弹窗信息架构变更
- [√] 2.2 更新 `helloagents/CHANGELOG.md`（Unreleased）补充本次变更说明

## 3. 测试
- [√] 3.1 执行 TypeScript 类型检查（`pnpm -C tuan-chat-web typecheck` 或等价命令）

## 4. 集成与归档
- [√] 4.1 迁移方案包至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
- [√] 4.2 自动集成 session 分支到集成分支并更新测试分支
