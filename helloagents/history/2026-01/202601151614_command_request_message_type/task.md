# 任务清单: 检定请求升级为独立消息类型

Ŀ¼: `helloagents/plan/202601151614_command_request_message_type/`

---

## 1. 前端消息类型对齐
- [√] 1.1 在 `api/wsModels.ts` 与 `app/types/voiceRenderTypes.ts` 增加 `COMMAND_REQUEST(12)`
- [√] 1.2 在 `api/models/MessageExtra.ts` 增加 `commandRequest`，并新增 `api/models/CommandRequestExtra.ts`

## 2. 发送侧改造
- [√] 2.1 在 `app/components/chat/room/roomWindow.tsx` 将检定请求发送改为 `COMMAND_REQUEST(12)` + 结构化 extra

## 3. 渲染与导出
- [√] 3.1 在 `app/components/chat/message/chatBubble.tsx` 按 `COMMAND_REQUEST(12)` 渲染按钮
- [√] 3.2 在 `app/utils/exportChatMessages.ts` 增加 `COMMAND_REQUEST(12)` 导出格式

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 运行 `pnpm typecheck`
