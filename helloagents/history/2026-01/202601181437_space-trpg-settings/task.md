# 任务清单: 跑团设置页面拆分

- [√] 任务1: 新增“跑团设置”入口与路由（`app/components/chat/space/spaceHeaderBar.tsx`、`app/components/chat/chatPage.tsx`、`app/components/chat/space/drawers/spaceDetailPanel.tsx`）
- [√] 任务2: 新建 `SpaceTrpgSettingWindow`，迁移规则/骰娘 UI 与保存逻辑（`app/components/chat/window/spaceTrpgSettingWindow.tsx`）
- [√] 任务3: 空间资料页移除规则/骰娘相关逻辑（`app/components/chat/window/spaceSettingWindow.tsx`）
- [√] 任务4: 更新知识库与变更记录（`helloagents/wiki/modules/chat.md`、`helloagents/CHANGELOG.md`）
- [X] 任务5: 质量验证（`pnpm typecheck`、`pnpm lint`）
  > 备注: `pnpm typecheck` 通过；`pnpm lint` 失败，`scripts/optimize-ai-style-images.mjs` 存在 brace-style 报错，且 `chatBubble.tsx` 与 `aiImage.tsx` 有既有 hooks 依赖警告。
