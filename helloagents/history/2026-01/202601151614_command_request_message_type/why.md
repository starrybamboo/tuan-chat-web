# 变更提案: 检定请求升级为独立消息类型

## 需求背景
当前“检定请求按钮消息”已在前端实现基本交互，但消息语义依赖 `TEXT + extra`，在后端与 OpenAPI 类型体系中不可见，难以统一校验与演进。

本变更将“检定/指令请求”升级为独立消息类型，前后端统一枚举并提供结构化 extra，简化渲染与导出逻辑，并便于后续做权限/可点击范围控制。

## 变更内容
1. 新增独立消息类型 `COMMAND_REQUEST(12)`（与后端 `MessageTypeEnum` 对齐）。
2. KP 发送包含 `@All` 的指令时，发送 `COMMAND_REQUEST(12)` 消息（不执行）。
3. 渲染侧按 `COMMAND_REQUEST(12)` 展示按钮；点击后以点击者身份发送并执行原指令。

## 影响范围
- **模块:** app（chat UI）、api（wsModels/models）
- **文件:**
  - `app/components/chat/room/roomWindow.tsx`
  - `app/components/chat/message/chatBubble.tsx`
  - `app/utils/exportChatMessages.ts`
  - `app/types/voiceRenderTypes.ts`
  - `api/wsModels.ts`
  - `api/models/MessageExtra.ts`
  - `api/models/CommandRequestExtra.ts`
- **API:** 与后端消息类型/extra 结构对齐（由后端项目提供）
- **数据:** 新增消息类型与结构化 extra

## 核心场景

### 需求: KP 发起检定请求（不执行）
**模块:** chat
KP 在 thread 中发送 `.r3d6*5 @All`，产生“检定请求”按钮消息，但不触发执行。

#### 场景: KP 在 thread 中请求全员检定
- 预期结果: 生成 `COMMAND_REQUEST(12)`，并归属到当前 thread。

### 需求: 玩家点击一键发送（按自己身份执行）
**模块:** chat + dicer
玩家点击“一键发送”，系统以玩家当前选择角色发送并执行指令，执行消息与骰娘回复落在原 thread。

#### 场景: 观战成员点击按钮被禁止
- 预期结果: 不发送消息并提示不可发送。

## 风险评估
- **风险:** 前后端枚举不同步会导致“消息类型无处理器”。
- **缓解:** 同步修改后端枚举与 handler，并在前端类型检查中加入 `COMMAND_REQUEST` 分支覆盖。
