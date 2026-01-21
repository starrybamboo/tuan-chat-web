# 任务清单: 跑团检定请求按钮消息

目录: `helloagents/plan/202601142250_command_request_button/`

---

## 1. Chat 发送侧（生成请求消息）
- [√] 1.1 在 `app/components/chat/room/roomWindow.tsx` 中识别包含 `@All` 的指令输入并发送“检定请求”消息，验证 why.md#需求-kp-发起检定请求不执行-场景-kp-在-thread-中请求全员检定

## 2. Chat 渲染侧（按钮展示与点击回调）
- [√] 2.1 在 `app/components/chat/chatFrame.tsx` 透传 `onExecuteCommandRequest` 到 `ChatBubble`，验证 why.md#需求-玩家点击一键发送按自己身份执行-场景-观战成员点击按钮被禁止
- [√] 2.2 在 `app/components/chat/message/chatBubble.tsx` 渲染 `extra.commandRequest` 为按钮 UI，并在不满足权限时禁用，验证 why.md#需求-玩家点击一键发送按自己身份执行-场景-观战成员点击按钮被禁止

## 3. dicer 执行链路（thread/回复一致）
- [√] 3.1 在 `app/components/common/dicer/cmdType.d.ts` 扩展 `ExecutorProp` 支持 `threadId`
- [√] 3.2 在 `app/components/common/dicer/cmdPre.tsx` 发送指令与骰娘回复时带上 `threadId`，并支持 `replyMessageId` 作为指令消息的 `replayMessageId`

## 4. 安全检查
- [√] 4.1 执行安全检查（按G9: 权限控制、输入处理、避免未授权发送）

## 5. 文档更新
- [√] 5.1 更新 `helloagents/wiki/modules/app.md`
- [√] 5.2 更新 `helloagents/CHANGELOG.md`

## 6. 测试
- [√] 6.1 运行 `pnpm -C tuan-chat-web typecheck`
