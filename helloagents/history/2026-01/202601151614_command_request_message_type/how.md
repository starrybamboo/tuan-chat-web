# 技术设计: 检定请求升级为独立消息类型

## 技术方案

### 核心技术
- 前后端统一消息类型枚举：`COMMAND_REQUEST(12)`
- 结构化 extra：`extra.commandRequest.{command, allowAll, allowedRoleIds}`
- 复用现有指令执行链路：`useCommandExecutor`（并沿用 threadId/replayMessageId 对齐）

### 实现要点
- 发送侧（KP）：
  - 识别输入包含 `@All` 且能提取到合法指令时，发送 `COMMAND_REQUEST(12)`，不进入指令执行分支。
  - `extra` 发送为 `{ commandRequest: { command, allowAll: true } }`。
- 渲染侧：
  - 当 `messageType === COMMAND_REQUEST(12)` 时展示“检定请求”UI 与“一键发送”按钮。
  - 观战成员/无角色成员（非 KP）禁用按钮。
- 点击执行：
  - 由 `RoomWindow` 承担最终执行（权限校验 + 调用 `commandExecutor`）。
  - 执行消息 `replayMessageId` 指向请求消息，`threadId` 保持与请求消息一致。

## 安全与性能
- **安全:** 复用现有发送权限（观战禁止、旁白仅 KP），避免未授权发送。
- **性能:** 仅新增分支渲染；`ChatBubble` memo 对 `extra.commandRequest` 做比较，避免更新丢失。

## 测试与部署
- **测试:** `pnpm typecheck`
- **部署:** 需与后端 `MessageTypeEnum` 同步上线（同一版本发布）。
