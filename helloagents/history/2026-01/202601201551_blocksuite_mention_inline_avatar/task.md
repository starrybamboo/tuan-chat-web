# 任务清单: Blocksuite mention 展示头像与昵称

Ŀ¼: `helloagents/plan/202601201551_blocksuite_mention_inline_avatar/`

---

## 1. blocksuite（自定义元素）
- [√] 1.1 新增 `app/components/chat/infra/blocksuite/spec/tcMentionElement.client.ts`：注册自定义 `<affine-mention />`，在文档内展示头像 + 用户名
- [√] 1.2 在 `app/components/chat/infra/blocksuite/spec/coreElements.ts` 中优先注册自定义 `<affine-mention />`，避免上游默认实现抢先注册

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/blocksuite.md` 记录 mention UI 展示与实现位置
- [√] 2.2 更新 `helloagents/CHANGELOG.md`（Unreleased）补充修复说明

## 3. 验证
- [√] 3.1 执行 `pnpm -C tuan-chat-web typecheck`

## 4. 归档与集成
- [√] 4.1 迁移方案包至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
- [√] 4.2 自动集成 session 分支到集成分支并更新测试分支
