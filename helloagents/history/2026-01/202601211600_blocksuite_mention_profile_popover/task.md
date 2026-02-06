# 任务清单: Blocksuite 文档内用户 mention 个人主页（点击跳转 + 悬浮预览）

Ŀ¼: `helloagents/plan/202601211600_blocksuite_mention_profile_popover/`

---

## 1. blocksuite
- [√] 1.1 为文档内 `<affine-mention />` 绑定 click/hover：上报 `userId` 与 `anchorRect` 给宿主
- [√] 1.2 宿主侧接收 `mention-click` 并跳转到 `/profile/:userId`
- [√] 1.3 宿主侧渲染“个人主页悬浮窗”：支持悬浮保持、Esc/点击外部关闭

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/blocksuite.md`：记录 mention 点击/悬浮个人主页交互
- [√] 2.2 更新 `helloagents/CHANGELOG.md`（Unreleased）：记录新增功能

## 3. 验证
- [√] 3.1 执行 `pnpm -s typecheck`

## 4. 归档与集成
- [√] 4.1 迁移方案包至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
- [√] 4.2 自动集成 session 分支到集成分支并更新测试分支
