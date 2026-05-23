# 移动端 ChatShell 与 Web Chat 状态模型对照

## 背景

当前移动端聊天入口集中在 [apps/mobile/src/features/chat/ChatShell.tsx](../apps/mobile/src/features/chat/ChatShell.tsx)。
该组件在 `218-242` 行持有 25 个本地 `useState`，同时承担：

- 工作区/房间切换
- 房间聊天输入与发送
- 消息操作、多选、回复
- 角色/头像选择
- DM 切换
- 多个 Sheet / Drawer 的显示状态

Web 端聊天主实现则位于：

- [app/components/chat/chatPage.tsx](../app/components/chat/chatPage.tsx)
- [app/components/chat/room/roomWindow.tsx](../app/components/chat/room/roomWindow.tsx)

Web 端已经把高频 UI 状态拆进多组 store，见：

- [app/components/chat/stores/roomUiStore.ts](../app/components/chat/stores/roomUiStore.ts)
- [app/components/chat/stores/chatComposerStore.ts](../app/components/chat/stores/chatComposerStore.ts)
- [app/components/chat/stores/chatInputUiStore.ts](../app/components/chat/stores/chatInputUiStore.ts)
- [app/components/chat/stores/roomRoleSelectionStore.ts](../app/components/chat/stores/roomRoleSelectionStore.ts)
- [app/components/chat/stores/sideDrawerStore.ts](../app/components/chat/stores/sideDrawerStore.ts)

本文目标不是直接要求移动端照抄 Web 组件，而是先把“状态语义”对齐，找出：

1. 已有可复用的状态模型
2. 适合抽成跨端 contract 的状态域
3. 当前移动端还未承接的 Web 能力

---

## 一、移动端 ChatShell 当前状态清单

来自 [ChatShell.tsx](../apps/mobile/src/features/chat/ChatShell.tsx)：

| 状态 | 语义 |
| --- | --- |
| `draftMessage` | 输入框正文 |
| `draftRoleIdInput` | 手输 roleId |
| `draftCustomRoleName` | 自定义发言身份名 |
| `messageAnchorId` | 当前回复锚点 |
| `messageError` | 发送/操作错误 |
| `messageMode` | 文本 / 指令 / 状态事件 |
| `messageSubmitPhase` | `idle/uploading/sending` |
| `messageAttachments` | 附件列表 |
| `actionMenuMessage` | 长按消息菜单目标 |
| `actionMenuPressY` | 消息菜单定位 |
| `multiSelectMode` | 多选模式开关 |
| `multiSelectedIds` | 多选消息集合 |
| `selectedRoleId` | 当前发言角色 |
| `selectedAvatarId` | 当前发言立绘 |
| `selectedAvatarFileId` | 当前发言头像文件 |
| `roleSwitchVisible` | 角色切换 Sheet |
| `drawerMode` | 左抽屉 tab：房间 / DM |
| `currentContactId` | 当前 DM 联系人 |
| `expressionPickerVisible` | 表情 Sheet |
| `initiativeSheetVisible` | 先攻 Sheet |
| `mapSheetVisible` | 地图 Sheet |
| `stateSheetVisible` | 状态 Sheet |
| `createSpaceVisible` | 创建空间 Sheet |
| `createRoomVisible` | 创建房间 Sheet |
| `profileSheetState` | 用户资料 Sheet |

---

## 二、按状态域对齐 Web 现有模型

### 1. 消息临时 UI：可直接对齐 `roomUiStore`

Web 端 `roomUiStore` 当前包含：

- `replyMessage`
- `insertAfterMessageId`
- `isMultiSelecting`
- `messageUndoStack` / `messageRedoStack`

定义见 [roomUiStore.ts](../app/components/chat/stores/roomUiStore.ts)。

| Mobile ChatShell | Web 对应 | 结论 | 说明 |
| --- | --- | --- | --- |
| `messageAnchorId` | `replyMessage` | 语义可对齐，但数据形态不同 | Mobile 只存 `messageId`；Web 直接存完整 `Message`。建议跨端 contract 统一成 `replyMessageId + replyPreview` 或直接统一成 `replyMessage`。 |
| `multiSelectMode` | `isMultiSelecting` | 可直接对齐 | 这是最明显的一组同义状态。 |
| `multiSelectedIds` | 无直接字段 | 需要补共享 contract | Web 当前 store 只管“是否处于多选模式”，没持有选中集合。若要跨端统一消息多选体验，应新增 `selectedMessageIds`。 |
| 无 | `insertAfterMessageId` | Mobile 缺位 | 移动端没有 Web 的“插入发送”模型。 |
| 无 | `messageUndoStack` / `messageRedoStack` | Mobile 缺位 | 移动端尚未承接 Web 的消息撤销/回退工作流。 |

结论：

- 这一域最适合成为第一批跨端共享 contract。
- `messageAnchorId` 不应继续只存 id，否则一到跨端就会丢语义。

建议的共享接口草案：

```ts
type SharedRoomUiState = {
  replyMessageId?: number;
  isMultiSelecting: boolean;
  selectedMessageIds: number[];
  insertAfterMessageId?: number;
};
```

### 2. 输入附件与标注：部分可对齐 `chatComposerStore`

Web 端 `chatComposerStore` 当前包含：

- `imgFiles`
- `emojiUrls`
- `fileAttachments`
- `audioFile`
- `annotations`
- `tempAnnotations`

定义见 [chatComposerStore.ts](../app/components/chat/stores/chatComposerStore.ts)。

| Mobile ChatShell | Web 对应 | 结论 | 说明 |
| --- | --- | --- | --- |
| `messageAttachments` | `imgFiles` / `fileAttachments` / `audioFile` / `emojiUrls` | 语义相近但结构不同 | Mobile 已把附件做成统一 `MobileMessageAttachment[]`；Web 仍按媒体种类拆开存。 |
| `messageMode` | 无直接字段 | 需要抽共享 contract | Web 通过输入语义和命令面板处理更多是“行为层”；Mobile 显式存 `TEXT / COMMAND_REQUEST / STATE_EVENT`。 |
| `messageSubmitPhase` | 无直接字段 | 需要抽共享 contract | Web 也有发送中状态，但未沉淀成独立 composer store 字段。 |
| `draftCustomRoleName` | 无直接字段 | 需要抽共享 contract | 这属于发送身份的一部分。 |
| 无 | `annotations` / `tempAnnotations` | Mobile 缺位 | Mobile 已有 `features/annotations` 组件，但 `ChatShell` 尚未接入发送链路。 |

结论：

- 如果目标是跨端复用输入逻辑，`chatComposerStore` 不能直接搬到 mobile，因为 `File`、DOM 粘贴、RN `DocumentPicker` 的附件模型不同。
- 但可以抽出一个**平台无关的 composer domain model**：

```ts
type SharedComposerAttachment =
  | { kind: "image"; id: string }
  | { kind: "audio"; id: string }
  | { kind: "video"; id: string }
  | { kind: "file"; id: string }
  | { kind: "emoji"; id: string };

type SharedComposerState = {
  plainText: string;
  customRoleName: string;
  mode: "text" | "command_request" | "state_event";
  submitPhase: "idle" | "uploading" | "sending";
  attachments: SharedComposerAttachment[];
  annotations: string[];
};
```

### 3. 输入框文本快照：应对齐 `chatInputUiStore`

Web 端 `chatInputUiStore` 当前包含：

- `plainText`
- `textWithoutMentions`
- `mentionedRoles`

定义见 [chatInputUiStore.ts](../app/components/chat/stores/chatInputUiStore.ts)。

| Mobile ChatShell | Web 对应 | 结论 | 说明 |
| --- | --- | --- | --- |
| `draftMessage` | `plainText` / `textWithoutMentions` | 可对齐，但需要拆分 | Mobile 现在只保留一个字符串；Web 区分“显示文本”和“去 @ 节点后的纯文本”。 |
| 无 | `mentionedRoles` | Mobile 缺位 | Mobile `ChatComposer` 已有 `@mention` 过滤逻辑，但只根据 `draftMessage` 临时算，不持久化成输入快照。 |
| `draftRoleIdInput` | 无对应 | Mobile 专属 / 待确认是否保留 | Web 当前角色选择不是靠手输 roleId。这个字段更像临时过渡输入。 |

结论：

- 若要走同构路线，移动端不应长期保留“只靠 `draftMessage` 做全部输入语义”的实现。
- `draftRoleIdInput` 更像移动端临时能力，不建议进入 shared contract。

### 4. 当前发言身份：基本可对齐 `roomRoleSelectionStore`

Web 端 `roomRoleSelectionStore` 当前包含：

- `curRoleIdMap`
- `curAvatarIdMap`

配套控制器见 [useRoomRoleState.ts](../app/components/chat/room/useRoomRoleState.ts)。

| Mobile ChatShell | Web 对应 | 结论 | 说明 |
| --- | --- | --- | --- |
| `selectedRoleId` | `curRoleIdMap[roomId]` | 可直接对齐 | 都是“当前房间发言角色”。 |
| `selectedAvatarId` | `curAvatarIdMap[roleId]` | 可直接对齐 | 都是“当前角色选中的立绘/头像”。 |
| `selectedAvatarFileId` | 无直接字段 | 需要补派生层 | Web 以 `avatarId` 为主；Mobile 额外缓存了 `avatarFileId` 方便 composer 展示。 |
| `roleSwitchVisible` | 无 store，对应 Web overlay / window | 适合归到 overlay domain | 可由平台层决定是 Sheet 还是 Window。 |

结论：

- 这是目前最接近可共享的状态域。
- `selectedAvatarFileId` 更适合作为 selector / derived data，而不是核心 store 字段。

### 5. 抽屉与功能面板：可部分对齐 `sideDrawerStore`

Web 端 `sideDrawerStore` 当前状态集合：

- `none/user/role/search/initiative/map/state/doc/docFolder/export/webgal`

定义见 [sideDrawerStore.ts](../app/components/chat/stores/sideDrawerStore.ts)。

| Mobile ChatShell | Web 对应 | 结论 | 说明 |
| --- | --- | --- | --- |
| `initiativeSheetVisible` | `state === "initiative"` | 可对齐为统一 overlay key | 平台展示形态不同，但语义一致。 |
| `mapSheetVisible` | `state === "map"` | 可对齐为统一 overlay key | 同上。 |
| `stateSheetVisible` | `state === "state"` | 可对齐为统一 overlay key | 同上。 |
| `expressionPickerVisible` | 无直接字段 | 可新增 shared overlay key | Web 目前更像 `expressionChooser` 输入子组件，不是右抽屉。 |
| `roleSwitchVisible` | 无直接字段 | 可新增 shared overlay key | Web 用 Window / Panel 组合，不是单一 store key。 |
| `actionMenuMessage` / `actionMenuPressY` | 无直接字段 | 平台专属 | Mobile 是长按弹出菜单定位；Web 是右键 / context menu 流。 |
| `drawerMode` | 无直接字段 | 平台专属 | Mobile 左抽屉在“房间 / DM”间切换；Web 左侧是更复杂的 space / room / doc / material 导航。 |

结论：

- `initiative/map/state` 这类“房间工具面板”可以收敛为跨端统一 `overlayKey`。
- `drawerMode`、消息菜单定位这种明显是交互容器差异，不应该强行共享。

建议的共享接口草案：

```ts
type SharedRoomOverlayKey =
  | "none"
  | "role_switch"
  | "expression_picker"
  | "initiative"
  | "map"
  | "state";
```

### 6. 导航与会话容器：大多仍是平台专属

| Mobile ChatShell | Web 对应 | 结论 | 说明 |
| --- | --- | --- | --- |
| `currentContactId` | Web 私聊是另一套 `privateChat` 组件树 | 当前未同构 | Mobile 把 DM 合并进 `ChatShell`；Web 私聊是独立模块。 |
| `createSpaceVisible` | Web `createSpaceWindow` | 可对齐为“打开创建空间 overlay”的动作，不建议共享具体状态容器 | 平台表现不同。 |
| `createRoomVisible` | Web `createRoomWindow` | 同上 | 同上。 |
| `profileSheetState` | Web profile page / modal | 适合共享 payload，不适合共享 UI state | 共享 `userId/avatarFileId/username` 即可。 |
| `messageError` | Web 更多用 toast / inline 状态 | 应下沉到控制器返回值，不建议做全局 store | 错误是行为结果，不是稳定 UI 状态。 |

---

## 三、移动端当前明显缺位的 Web 聊天能力

下面这些不是“名字不同”，而是移动端当前确实还没有承接完整模型：

### 1. 注解（annotations）

- Mobile 已有 `features/annotations` 组件与 catalog。
- 但 `ChatShell` / `ChatComposer` / `useSendRoomMessageMutation` 当前没有把注解状态真正串进发送体验。
- Web 的 `chatComposerStore` 已把 `annotations` 和 `tempAnnotations` 纳入输入状态。

### 2. 文档 / 素材 / 工作流 / WebGAL / 子窗口

Web 的聊天页把这些作为一等能力承接，见 [chatPage.types.ts](../app/components/chat/chatPage.types.ts)：

- `workflow`
- `trpg`
- `webgal`
- `material`
- doc route / subwindow

移动端当前聊天主入口没有对应状态域。

### 3. 消息撤销 / 回退 / 插入发送

这些都已经进入 Web `roomUiStore` 和 `RoomWindow` 主流程；
移动端当前没有等价状态模型。

---

## 四、建议的跨端对齐顺序

如果目标是“优先同构，而不是先给 mobile 发明一套新架构”，建议顺序如下：

### P0：先对齐状态 contract，不急着统一组件

优先抽出 4 组共享类型：

1. `SharedRoomUiState`
2. `SharedComposerState`
3. `SharedInputSnapshot`
4. `SharedRoomOverlayKey`

这些类型可以先落在 `packages/tuanchat-domain` 或新建 `packages/tuanchat-chat-contract`。

### P1：移动端优先改成“按状态域分组”，但不强推 web 容器

建议把 `ChatShell` 里的状态按下面四块收敛：

- `roomUi`
- `composer`
- `roleSelection`
- `overlay`

先用 local reducer / provider 也可以，关键是语义和 Web 对齐。

### P2：把当前确定缺位的能力补齐到 contract

优先级建议：

1. Annotations
2. Multi-select selected ids
3. Role/avatar derived data

### P3：再决定是否把 store 也统一

只有在状态 contract 对齐之后，才值得讨论：

- 是否让 mobile 也使用 zustand
- 是否抽跨端 controller hook
- 哪些 store 是共享逻辑，哪些只是平台壳

---

## 五、结论

当前移动端与 Web 聊天模块的真实关系是：

- **数据模型与部分纯逻辑已共享**
- **状态语义只共享了一部分**
- **聊天 UI 容器和交互编排仍明显分叉**

因此，移动端 `ChatShell` 的下一步不应只是“拆小组件”，而应是：

1. 先把本地 state 对齐到 Web 已有状态域
2. 抽出跨端共享 contract
3. 再做容器重构

如果跳过这一步直接做 mobile-only 拆分，会让两端继续各长一套，后面更难收拢。
