# Copilot 拖拽引入 Room 上下文实施计划

更新时间：2026-05-06

## 背景

当前 Galgame Copilot 已经能基于当前房间生成 `GalStoryPatch`，但用户无法像 Copilot 一样显式拖入上下文。例如用户希望“参考另一个 room 的风格/剧情/设定”，现在只能在自然语言里描述，模型看不到那个 room 的结构化内容。

本计划目标是实现：用户把左侧房间拖到右侧 Copilot 对话区后，Copilot 输入区出现可见上下文 chip；发送请求时，前端把这些 chip 解析成结构化参考上下文，模型可以参考，但只能修改当前房间。

## 参考的 Copilot 代码模式

本地参考仓库：`D:\A_AI_chat\vscode-copilot-chat`

Copilot 的关键模式不是“把引用拼进一句普通 prompt”，而是把上下文作为显式引用贯穿请求链路：

- `src/extension/context/vscode/context.contribution.ts`：`github.copilot.chat.attachFile` / `attachSelection` 转发到 VS Code 核心的 Add Context 能力。
- `src/extension/prompt/common/conversation.ts`：`Turn.fromRequest` 把 `request.references` 包成 `ChatVariablesCollection`。
- `src/extension/prompts/node/panel/chatVariables.tsx`：`ChatVariables` / `ChatVariablesAndQuery` 把引用渲染成 `<attachments>`。
- `src/extension/prompt/vscode-node/promptVariablesService.ts`：把用户文本里的引用替换成 `[#name](#name-context)`，让模型知道这是上下文锚点。
- `src/extension/conversation/vscode-node/remoteAgents.ts`：`prepareClientPlatformReferences` 把 references 转成 `copilot_references`，例如 `client.file`、`client.selection`、`github.repository`。
- `src/extension/conversation/vscode-node/remoteAgents.ts`：历史消息会带回上一轮 `copilot_references`，上下文引用成为会话元数据的一部分。

映射到团剧共创：

```txt
VS Code ChatPromptReference
  -> 团剧 CopilotContextRef

VS Code ChatVariablesCollection
  -> 团剧 CopilotContextRefCollection / resolver

VS Code <attachments>
  -> 团剧 prompt 里的 referenceRooms 附件区

VS Code copilot_references
  -> 团剧 Copilot 对话消息上的 contextRefs 元数据
```

## 产品目标

1. 用户从左侧房间列表拖一个 room 到右侧 Copilot 面板。
2. Copilot 面板显示一个上下文 chip，例如 `参考房间：雨夜前奏`。
3. 用户继续输入“按这个房间的压抑感重写最后三句”。
4. 请求发送时，当前房间仍作为唯一可修改目标；拖入 room 作为只读参考。
5. 模型生成的 patch 仍进入现有 proposal / diff / 按行接受 / 应用链路。
6. 刷新或重新打开 Copilot 后，上下文引用仍能恢复，除非用户移除。

## 非目标

- 不让 AI 直接修改参考 room。
- 不让 patch 引用参考 room 的 `messageId`。
- 不改变“拖到主聊天区发送群聊跳转卡片”的现有行为。
- 不引入独立 BFF / Node 服务。
- 不做跨空间 room 参考，第一版只支持当前 space 内 room。
- 不把整个空间所有 room 隐式塞给模型。

## 需要审核的产品决策

### 决策 1：拖入上下文默认是否持续

建议：第一版采用“持续到手动移除”。

理由：团剧的“参考某个 room”通常是连续追改过程的一部分，用户下一句很可能继续说“再更像一点”。如果每轮发送后自动清空，会更像一次性附件，但会打断连续修改。

后续增强：增加 pin / 本轮引用两种状态。

### 决策 2：参考 room 数量上限

建议：第一版最多 3 个参考 room。

理由：控制 prompt 大小和 UI 复杂度。超过 3 个时提示用户先移除旧引用。

### 决策 3：单个参考 room 消息上限

建议：第一版最多 120 条投影消息。

截断策略：

- 如果总数不超过 120，全部放入。
- 如果超过 120，保留前 20 条、后 80 条，以及中间的 `choice/control/background/bgm/se/cg` 关键节点，最终再裁到 120。
- UI chip 上显示 `已引用 120/356 条`。

### 决策 4：拖入当前房间

建议：忽略并提示“当前房间已在 Copilot 上下文中”。

### 决策 5：参考 room 加载失败

建议：chip 显示错误状态，不参与请求；用户可以删除后重拖。

## 总体架构

```txt
RoomSidebarRoomItem drag payload
  -> RoomCopilotDrawer drop zone
  -> CopilotContextRef chip state
  -> roomCopilotConversationStore 持久化 refs
  -> send
  -> resolveGalCopilotContextRefs
  -> getGalAuthoringContext(reference room)
  -> buildGalCopilotPrompt(referenceRooms)
  -> requestGalCopilotPatchStream
  -> createGalPatchProposal(current room only)
  -> existing diff preview/apply
```

## 数据结构设计

### CopilotContextRef

前端 UI / 本地持久化使用：

```ts
export type CopilotContextRef =
  | {
    kind: "room";
    roomId: string;
    spaceId?: string;
    label: string;
    source: "drag";
    status?: "ready" | "loading" | "error";
    error?: string | null;
  };
```

### Contract 扩展

位置：`packages/galgame-ai-contract/src/types.ts`、`schemas.ts`

建议新增：

```ts
export type GalReferenceRoomContext = {
  refId: string;
  room: GalRoomContext;
  messages: GalMessageView[];
  roles: {
    roomRoles: GalRoomRole[];
    narrator: GalNarrator;
  };
  truncation?: {
    originalMessageCount: number;
    includedMessageCount: number;
    strategy: "full" | "head_tail_key_nodes";
  };
};
```

并在 `GalAuthoringContext` 中新增可选字段：

```ts
referenceRooms?: GalReferenceRoomContext[];
```

保留现有：

```ts
attachmentRefs: GalReference[];
```

二者分工：

- `attachmentRefs`：表达用户显式引用了哪些对象。
- `referenceRooms`：真正给模型看的只读参考上下文。

### Prompt 里的 referenceRooms 形态

为了防止模型误用参考 room 的 `messageId`，prompt 层不要把参考消息渲染成和当前房间完全一样的 `messageId` 字段。

建议 `copilotPrompts.ts` 中将参考消息渲染为：

```ts
{
  referenceId: "room:456/message:789",
  position: 12,
  purpose: "dialogue",
  roleName: "千夏",
  content: "……",
  annotations: ["..."]
}
```

同时 system prompt 明确：

```txt
referenceRooms 是只读参考资料。
GalStoryPatch.operations 只能引用 current room messages 中的 messageId。
禁止在 operations 中使用 referenceRooms 的 referenceId 或原始 messageId。
```

## 具体文件计划

### 1. 复用已有拖拽来源

已有文件：

- `app/components/chat/room/roomSidebarRoomItem.tsx`
- `app/components/chat/utils/roomRef.ts`

现状：

- `roomSidebarRoomItem.tsx` 已写入 `ROOM_DRAG_MIME`、`text/plain: room:<id>` 和 `setRoomRefDragData(...)`。
- `roomRef.ts` 已提供 `setRoomRefDragData`、`getRoomRefDragData`、`isRoomRefDrag`。

计划：

- 不改拖拽来源协议。
- Copilot drawer 直接复用 `getRoomRefDragData` / `isRoomRefDrag`。

### 2. Copilot drawer 增加 drop zone 和 chips

修改：

- `app/components/chat/room/drawers/roomCopilotDrawer.tsx`

任务：

- 在 drawer 根容器或输入区增加 `onDragOver` / `onDrop`。
- 检测 `isRoomRefDrag(event.dataTransfer)`。
- `event.preventDefault()`、`event.stopPropagation()`，避免落到外层 `RoomDocRefDropLayer` 后发送 room jump。
- 将 payload 归一化为 `CopilotContextRef`。
- 去重：同一个 `roomId` 只能出现一次。
- 限制最多 3 个。
- 在输入框上方展示 chips。
- chip 支持删除。
- 当前房间被拖入时提示并忽略。

注意：

- `RoomDocRefDropLayer` 的 `onDrop` 是 bubble 阶段，drawer 内部 `stopPropagation` 可以阻止主聊天区发送跳转。
- `onDragOverCapture` 仍可能显示外层遮罩，必要时给 drawer 增加 `data-tc-copilot-context-drop-zone` 并让 `RoomDocRefDropLayer` 在这个区域不显示“发送群聊跳转”遮罩。

### 3. 持久化上下文 refs

修改：

- `app/components/chat/galgameAi/copilotConversationStore.ts`
- `app/components/chat/galgameAi/copilotConversationStore.test.ts`

任务：

- 当前 store 已按 `roomId` 持久化 messages。
- 扩展 payload，保存：

```ts
{
  version: 2,
  roomId,
  messages,
  contextRefs
}
```

- 兼容 version 1：没有 `contextRefs` 时返回空数组。
- pending 消息恢复逻辑保持不变。

验收：

- 刷新后 Copilot 对话恢复。
- 拖入的 room chips 也恢复。
- 旧 localStorage 数据不报错。

### 4. 新增 context ref resolver

新增：

- `app/components/chat/galgameAi/copilotContextRefs.ts`

职责：

- `normalizeCopilotContextRef(payload, currentRoomId)`
- `dedupeCopilotContextRefs(refs)`
- `limitCopilotContextRefs(refs, max = 3)`
- `resolveGalCopilotContextRefs(params)`

输入：

```ts
{
  spaceId: number;
  currentRoomId: number;
  refs: CopilotContextRef[];
  queryClient?: QueryClient;
}
```

输出：

```ts
{
  attachmentRefs: GalReference[];
  referenceRooms: GalReferenceRoomContext[];
  warnings: string[];
}
```

解析策略：

- 只解析 `kind === "room"`。
- `spaceId` 必须等于当前 space，第一版不跨空间。
- 优先使用 React Query cache。
- cache 缺失再使用现有 OpenAPI client。
- room 消息使用和当前 Copilot 一致的 `projectGalMessages`。
- room roles 使用 `roomRoleQueryKey` / `roomNpcRoleQueryKey` 对应缓存或接口。
- role avatars 使用 `roleAvatarsQueryKey` 缓存或接口。
- annotation catalog 复用当前 `buildGalAnnotations(mergeAnnotationCatalog())`。

实现注意：

- `galAuthoringService.ts` 里很多 resolver 目前是 private。实现时应抽出可复用 helper，例如：

```txt
app/components/chat/galgameAi/galAuthoringDataResolvers.ts
```

避免复制一套 `resolveRoom / resolveMessages / resolveRoomRoles / getRoleAvatarMap`。

### 5. 扩展 GalAuthoringContext 构建

修改：

- `packages/galgame-ai-contract/src/types.ts`
- `packages/galgame-ai-contract/src/schemas.ts`
- `packages/galgame-ai-contract/src/schemas.test.ts`
- `app/components/chat/galgameAi/authoringProjection.ts`
- `app/components/chat/galgameAi/galAuthoringService.ts`
- `app/components/chat/galgameAi/galAuthoringService.test.ts`

任务：

- contract 新增 `galReferenceRoomContextSchema`。
- `galAuthoringContextSchema` 新增 `referenceRooms?: z.array(...)`。
- `buildGalAuthoringContext` 接收 `referenceRooms`。
- `getGalAuthoringContext` 参数新增 `referenceRooms?: GalReferenceRoomContext[]` 或 `contextRefs?: CopilotContextRef[]`。

建议边界：

- `getGalAuthoringContext` 只负责当前房间上下文。
- `resolveGalCopilotContextRefs` 在 drawer send 前执行。
- 然后把结果传给 `getGalAuthoringContext({ attachmentRefs, referenceRooms })`。

这样职责更清楚。

### 6. Prompt 接入 referenceRooms

修改：

- `app/components/chat/galgameAi/copilotPrompts.ts`
- `app/components/chat/galgameAi/copilotClient.test.ts`

任务：

- `toPromptContext` 增加 `referenceRooms`。
- 当前房间字段命名为 `currentRoom` 或保持 `room/messages`，但 prompt 文案明确这是唯一可修改目标。
- `referenceRooms` 渲染为只读附件区。
- 不暴露参考 room 的可 patch `messageId` 字段，改为 `referenceId`。
- system prompt 增加禁止跨房间 patch 的规则。

测试重点：

- prompt 包含 reference room 名称和内容。
- prompt 明确 reference room 只读。
- prompt 里的参考消息没有裸 `messageId` 字段。

### 7. 发送链路接入

修改：

- `app/components/chat/room/drawers/roomCopilotDrawer.tsx`

任务：

- `handleSend` 中先解析 active context refs。
- 调 `getGalAuthoringContext` 时带入：

```ts
attachmentRefs,
referenceRooms
```

- 将 context refs 绑定到本轮 user message：

```ts
type CopilotChatMessage = {
  ...
  contextRefs?: CopilotContextRef[];
}
```

- `buildConversationalInstruction` 可以摘要最近几轮引用，例如：

```txt
用户本轮引用：房间「雨夜前奏」
```

但真正内容仍由 `referenceRooms` 提供。

### 8. UI 状态与反馈

修改：

- `app/components/chat/room/drawers/roomCopilotDrawer.tsx`

状态：

- `ready`：正常 chip。
- `loading`：解析参考 room 中。
- `error`：解析失败，不参与请求。

交互：

- 拖入时显示轻量提示边框，例如“松开添加为 Copilot 参考”。
- 发送时显示状态“正在读取参考房间”。
- 解析失败 toast：`参考房间「xxx」读取失败，已跳过`。

### 9. 与主聊天拖拽行为隔离

相关文件：

- `app/components/chat/room/roomDocRefDropLayer.tsx`
- `app/components/chat/room/roomWindowLayout.tsx`

任务：

- 保持拖到主聊天区发送 room jump。
- 拖到 Copilot drawer 不发送 room jump。
- 如外层遮罩干扰，给 Copilot drawer 标记：

```tsx
data-tc-copilot-context-drop-zone
```

并在 `RoomDocRefDropLayer` 中遇到该区域时不显示主聊天 drop overlay。

## 分阶段实施

### 阶段 0：类型与计划确认

产物：

- 本计划文档。
- 审核 `CopilotContextRef`、`referenceRooms`、数量上限、截断策略。

不改功能代码。

### 阶段 1：UI 可拖入但不进模型

目标：先把交互做出来。

任务：

- drawer 接收 room drop。
- 显示 chips。
- 去重、删除、上限、当前房间忽略。
- context refs 本地持久化。
- 不改 prompt，不请求参考 room 内容。

验收：

- 拖 room 到 Copilot 面板后出现 chip。
- 刷新后 chip 恢复。
- 拖到主聊天区仍发送 room jump。
- 拖到 Copilot 面板不发送 room jump。

### 阶段 2：resolver 和 contract

目标：把 chips 解析成结构化参考上下文。

任务：

- contract 加 `GalReferenceRoomContext`。
- 新增 `copilotContextRefs.ts`。
- 抽复用 `galAuthoringDataResolvers.ts`。
- 解析参考 room 的 room/messages/roles/avatarVariants。
- 实现截断策略。

验收：

- cache 命中时不请求 REST。
- cache 缺失时能 fallback REST。
- 参考 room 输出包含消息、角色、截断信息。
- 失败时返回 warning，不阻塞当前房间生成。

### 阶段 3：prompt 和生成链路接入

目标：模型真的能参考拖入 room。

任务：

- `copilotPrompts.ts` 输出 `referenceRooms`。
- system prompt 限制只修改当前房间。
- `roomCopilotDrawer.tsx` 在 `handleSend` 中解析 refs 并传入 context。
- proposal 仍只基于当前房间 `baseSnapshot`。

验收：

- 让模型“参考 A 房间风格改当前房间”时，prompt 中包含 A 房间内容。
- patch validation 仍只允许当前房间 messageId。
- 参考 room 的 messageId 不会直接出现在可 patch 字段里。

### 阶段 4：对话历史中的引用连续性

目标：像 Copilot 一样，引用成为会话的一部分。

任务：

- `CopilotChatMessage` 增加 `contextRefs`。
- user message bubble 显示本轮引用。
- 持久化每轮 message 的 contextRefs。
- `buildConversationalInstruction` 摘要最近引用。

验收：

- 历史中能看到“本轮参考了哪个 room”。
- 刷新后历史引用仍显示。
- 后续追问能知道用户之前参考过哪个 room。

### 阶段 5：视觉和回归

目标：收口体验。

任务：

- drop hover 样式。
- chip 删除按钮、错误状态、截断提示。
- 移动端/窄屏布局检查。
- 文案收敛。

验收：

- 不遮挡现有输入框。
- chips 多个时换行且不撑爆 drawer。
- 错误和 loading 状态可理解。

## 测试计划

### 单元测试

新增/修改：

- `app/components/chat/galgameAi/copilotContextRefs.test.ts`
- `app/components/chat/galgameAi/copilotConversationStore.test.ts`
- `app/components/chat/galgameAi/copilotClient.test.ts`
- `packages/galgame-ai-contract/src/schemas.test.ts`
- `app/components/chat/galgameAi/galAuthoringService.test.ts`

用例：

- room drag payload 归一化。
- 同 room 去重。
- 超过 3 个被限制。
- 当前 room 被忽略。
- localStorage version 1 兼容。
- reference room 截断策略。
- prompt 中 referenceRooms 只读。
- prompt 中参考消息不暴露裸 `messageId`。

### 集成/交互测试

优先做可单测的逻辑；必要时补组件测试。

用例：

- Copilot drawer drop room 后出现 chip。
- 删除 chip 后不参与请求。
- 外层 `RoomDocRefDropLayer` 不处理 Copilot drawer 内 drop。

### 必跑命令

按当前仓库规则，涉及测试时执行：

```txt
pnpm exec vitest run app/components/chat/galgameAi/copilotContextRefs.test.ts app/components/chat/galgameAi/copilotConversationStore.test.ts app/components/chat/galgameAi/copilotClient.test.ts packages/galgame-ai-contract/src/schemas.test.ts app/components/chat/galgameAi/galAuthoringService.test.ts
pnpm typecheck
pnpm exec eslint <touched files>
pnpm test
```

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 参考 room 消息太多导致 token 爆炸 | 最多 3 个 room，单 room 最多 120 条，提示截断。 |
| 模型误改参考 room | prompt 明确只读；reference prompt 不暴露裸 `messageId`；proposal validation 只基于当前房间。 |
| 拖到 Copilot 也触发 room jump | drawer drop 阻止冒泡；必要时 `RoomDocRefDropLayer` 排除 Copilot drop zone。 |
| 缓存缺失导致重复请求 | resolver 优先 React Query cache；只在缺失时 fallback REST。 |
| 上下文引用和对话历史断裂 | context refs 与 Copilot messages 一起持久化。 |
| 类型漂移 | contract 扩展 schema，prompt/client/service 测试覆盖。 |

## 建议审核结论

建议按以下默认值进入实现：

- 第一版只支持拖 room 到 Copilot drawer。
- 拖入引用默认持续到用户手动删除。
- 最多 3 个参考 room。
- 单个参考 room 最多 120 条消息。
- 参考 room 只读，不支持跨房间 patch。
- prompt 中参考消息使用 `referenceId`，不暴露裸 `messageId`。
