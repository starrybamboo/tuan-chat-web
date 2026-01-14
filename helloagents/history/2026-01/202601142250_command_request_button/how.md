# 技术设计: 跑团检定请求按钮消息

## 技术方案

### 核心技术
- React 组件扩展（`ChatFrame`/`ChatBubble`）
- 复用现有骰娘指令执行链路（`useCommandExecutor`）
- 复用现有 Thread 发送字段（`ChatMessageRequest.threadId`）

### 实现要点
- **请求消息协议（前端约定）**
  - 消息类型仍为 `MessageType.TEXT`，避免后端枚举不匹配风险。
  - 在 `message.extra` 中增加 `commandRequest` 字段：
    - `command`: 要执行的原始指令文本（包含前缀，如 `.r3d6*5`）
    - `allowAll`: 是否允许所有成员点击执行（由 `@All` 触发）
    - `allowedRoleIds`: 可选，后续可用于限制可点击角色
- **发送侧：KP 触发请求**
  - 在 `RoomWindow.handleMessageSubmit` 中，在普通指令执行分支之前拦截：
    - 从输入中提取第一个合法指令片段（允许 `@All` 出现在前/后）
    - 检测到 `@All` 且为 KP 时，发送请求消息并清空输入，不进入 `commandExecutor`
- **渲染侧：按钮展示与点击**
  - `ChatBubble` 检测 `message.extra.commandRequest`，将文本区替换为“检定请求”按钮 UI。
  - 通过 `ChatFrame` 传入回调到 `ChatBubble`，点击时回调给 `RoomWindow` 执行。
- **执行侧：一键发送**
  - `RoomWindow` 提供 `onExecuteCommandRequest`：
    - 观战成员直接禁止
    - 未选择角色且非 KP（旁白）时禁止
    - 调用 `commandExecutor`，并将 `threadId` 与 `replyMessageId` 传入
- **指令执行器：补齐 threadId/回复引用**
  - 扩展 `ExecutorProp` 支持 `threadId`
  - `cmdPre.tsx` 发送指令消息与骰娘回复消息时带上 `threadId`
  - 若传入 `replyMessageId`，则指令消息本身设置 `replayMessageId`，使执行链路在 UI 上可追溯到请求消息

## 安全与性能
- **安全:** 仅在本地点击触发发送；仍复用现有发送权限判断（观战禁止、旁白仅 KP 可用），不引入明文密钥或外部请求。
- **性能:** 请求消息渲染为简单按钮，不引入额外重渲染热点；同时补齐 `ChatBubble` memo 对 `commandRequest` 的比较，避免未来更新不刷新。

## 测试与部署
- **测试:** 运行 `pnpm -C tuan-chat-web typecheck`；手动在 UI 验证：
  - KP 在 thread 发送 `.r3d6*5 @All` 生成按钮且不执行
  - 玩家点击后在同 thread 内出现指令消息与骰娘回复
  - 观战成员点击提示禁止
- **部署:** 前端发布即可，无后端迁移。
