# BGM 全员同步播放（前端）

## 背景与目标

实现“KP 发送 BGM 音频后，房间内所有人开始播放该音频（单曲循环）”，并支持：

- 每个用户可通过悬浮球/工具栏控制自己的开关
- 进出房间/切换房间等打断后停止，但可手动重开
- KP 发送停止信息后全员停止
- 用户主动暂停后若没有其它音频在播放，全局悬浮球会隐藏（避免常驻遮挡）；仍可通过工具栏手动重开（KP 未停止时）

本实现尽量复用现有群聊消息推送与 `SOUND` 消息结构，不新增新的 WS 推送类型。

## 协议约定（复用现有消息）

### 1) KP 开始播放 BGM

- 触发消息：群聊消息 `MessageType.SOUND`
- 识别条件：`extra.soundMessage.purpose === 'bgm'`
- 音频来源：`message.fileUrl`（或同等 URL 字段）
- 行为：客户端收到后为对应 `roomId` 记录 track，并在当前激活房间尝试自动播放（循环）。

### 2) KP ֹͣȫԱ BGM

- 触发消息：群聊消息 `MessageType.SYSTEM`
- 内容约定：`content` 包含固定标记 `[ֹͣBGM]`
- 行为：所有客户端收到后对该 `roomId` 立即停止播放并清空 track，并设置 `kpStopped=true`（阻止再次开启）。

> 说明：停止协议目前采用 SYSTEM + 文本标记，后续如果要更强约束可升级为专用消息类型或 extra 字段。

## 前端实现结构

### 播放底座

- 文件：`app/components/chat/infra/bgm/bgmPlayer.ts`
- 职责：封装单例 `HTMLAudioElement`（loop、volume、play/pause/stop），提供纯播放控制 API。

### 状态机（Zustand）

- 文件：`app/components/chat/stores/bgmStore.ts`
- 核心状态（按 roomId 维度）：
  - `trackByRoomId`：当前 BGM track（url/volume 等）
  - `kpStoppedByRoomId`：KP 是否已发“停止全员”
  - `userDismissedByRoomId`：预留：用户是否“主动停止并隐藏控件”（当前实现不再使用该标记）
  - `activeRoomId`：当前用户正在查看/激活的房间
- 核心动作：
  - `onBgmStartFromWs(roomId, track)`：收到 BGM SOUND 推送
  - `onBgmStopFromWs(roomId)`：收到 SYSTEM `[ֹͣBGM]`
  - `onRoomInterrupted(roomId)`：打断（切房/卸载）导致暂停
  - `userToggle(roomId)`：用户通过 UI 开关
  - `userStopAndDismiss(roomId)`：用户主动停止（仅自己；当前实现不再 dismiss）

### WS 收消息触发点

- 文件：`api/useWebSocket.tsx`
- 处理点：群聊消息推送（type=4）入本地缓存前，遍历新增消息：
  - `SOUND + purpose=bgm` → `useBgmStore.getState().onBgmStartFromWs(...)`
  - `SYSTEM + content 包含 [ֹͣBGM]` → `useBgmStore.getState().onBgmStopFromWs(...)`

### UI

- 全局音频悬浮球：`app/components/common/audioFloatingBall.tsx`
  - BGM 通过 `app/components/chat/infra/bgm/bgmPlaybackRegistry.tsx` 注册到聚合列表
  - 悬浮球仅在存在“正在播放的音频”时显示；点击可展开列表并暂停/ֹͣ
- 工具栏按钮：`app/components/chat/input/chatToolbar.tsx`
  - 个人开关：用户关闭为“暂停”（仅自己），可再次点击重开（KP 未停止时）
  - KP 按钮：触发发送 SYSTEM `[ֹͣBGM]`（在 `roomWindow.tsx` 实现回调）

## 行为规则总结

- 自动播放仅在 `activeRoomId` 对应房间触发：避免用户在别的房间时被强制外放。
- “打断”=暂停：切房/卸载会停止当前播放；用户回到房间后可手动重开。
- “用户主动停止”=暂停：仅停止当前播放；若无其它音频播放，全局悬浮球会隐藏（工具栏仍可重开）。
- “KP 停止全员”=强制停止：所有人停止并标记 `kpStopped`，阻止再次开启。

## 已知限制与后续可选增强

- 浏览器自动播放策略可能阻止首次自动播放：当前逻辑会保留 track，用户可通过悬浮球/按钮手动启动。
- 协议当前依赖 SYSTEM 文本标记 `[ֹͣBGM]`：如果担心误触发/国际化，建议升级为专用 messageType 或在 extra 中添加结构化字段。
