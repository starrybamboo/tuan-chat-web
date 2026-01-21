# 任务清单: 导入文本无角色时快速创建角色

目录: `helloagents/plan/202601201424_chat_import_quick_create_role/`

---

## 1. chat
- [√] 1.1 在 `app/components/chat/window/importChatMessagesWindow.tsx` 增加无角色提示与“创建/导入角色”入口
- [√] 1.2 在 `app/components/chat/room/roomWindow.tsx` 将“打开 roleAddPop”回调传入导入弹窗

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/chat.md`
- [√] 2.2 更新 `helloagents/CHANGELOG.md`

## 3. 测试
- [√] 3.1 运行 `pnpm typecheck` 与 `pnpm lint`
