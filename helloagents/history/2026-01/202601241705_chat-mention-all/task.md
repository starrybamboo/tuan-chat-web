# 任务清单: 聊天 @All 提及入口

目录: `helloagents/plan/202601241705_chat-mention-all/`

---

## 1. 聊天提及列表扩展
- [√] 1.1 在 `app/components/chat/room/roomComposerPanel.tsx` 中为 KP 的 @ 提及列表加入 `@All` 条目，并携带“检定请求”标注
- [√] 1.2 在 `app/components/atMentionController.tsx` 中展示提及条目的备注文案

## 2. 文档同步
- [√] 2.1 更新 `helloagents/wiki/modules/chat.md`，记录 @ 提及列表新增 `@All` 与“检定请求”说明

## 3. 安全检查
- [√] 3.1 检查本次改动不涉及敏感信息与高风险操作

## 4. 测试
- [-] 4.1 手动检查：@ 提及列表出现 `@All` 且标注“检定请求”，发送后触发检定请求逻辑
  > 备注: 未执行手动检查（需要在 UI 验证 @All 提及与检定请求流程）
