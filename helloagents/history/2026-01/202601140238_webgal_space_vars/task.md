# 任务清单: WebGAL 空间变量系统（聊天指令驱动）

目录: `tuan-chat-web/helloagents/plan/202601140238_webgal_space_vars/`

---

## 1. 协议与数据（WebSocket / SpaceExtra）
- [√] 1.1 在 `tuan-chat-web/api/wsModels.ts` 中新增 `MessageType.WEBGAL_VAR`，并明确 `extra` 结构，验证 why.md#需求-2变量变更消息类型-场景消息可读展示与可导出
- [√] 1.2 定义空间持久化字段 `space.extra.webgalVars` 的结构与合并策略（不覆盖既有字段如 `dicerData`），验证 why.md#需求-1空间级变量持久化-场景通过聊天指令设置变量

## 2. Chat 指令与发送（RoomWindow）
- [√] 2.1 在 `tuan-chat-web/app/components/chat/room/roomWindow.tsx` 中实现 `/var set <key>=<expr>` 解析与发送 `WEBGAL_VAR` 消息（不走骰娘 commandExecutor），验证 why.md#需求-1空间级变量持久化-场景通过聊天指令设置变量
- [√] 2.2 发送侧写入 `space.extra.webgalVars`（使用 `useSetSpaceExtraMutation`），并处理失败提示/回滚策略，验证 why.md#需求-1空间级变量持久化-场景跨房间共享变量

## 3. WebGAL 实时渲染联动
- [√] 3.1 在 `tuan-chat-web/app/webGAL/realtimeRenderer.ts` 中支持渲染 `WEBGAL_VAR`：转换为 `setVar:${key}=${expr} -global;` 并写入场景，验证 why.md#需求-3webgal-实时渲染联动-场景变量变更写入脚本并影响后续渲染
- [-] 3.2（可选）渲染启动时从 `space.extra.webgalVars` 做一次“状态补偿写入”，确保重启后变量一致

## 4. Chat 展示与导出
- [√] 4.1 在 `tuan-chat-web/app/components/chat/message/chatBubble.tsx`（或对应消息渲染组件）中增加对 `WEBGAL_VAR` 的展示样式（例如 `[变量] a = 1`）
- [√] 4.2 在 `tuan-chat-web/app/utils/exportChatMessages.ts` 中增加对 `WEBGAL_VAR` 的导出格式

## 5. 安全检查
- [√] 5.1 按 G9 执行安全检查：避免明文敏感信息、避免破坏性操作、评估指令滥用边界（与现有 `%` WebGAL 指令能力对齐）

## 6. 文档同步
- [√] 6.1 更新 `tuan-chat-web/app/components/chat/README.md`：补充变量消息类型与 `/var` 指令说明
- [√] 6.2 更新 `tuan-chat-web/helloagents/wiki/modules/app.md`（或更合适的模块文档）：记录空间变量的存储键、消息类型、渲染路径

## 7. 测试
- [-] 7.1 为指令解析与 `space.extra` 合并逻辑补充单元测试（如仓库现有测试模式允许）
