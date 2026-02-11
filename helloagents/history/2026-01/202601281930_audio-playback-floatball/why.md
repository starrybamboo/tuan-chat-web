# 变更提案: 全局音频悬浮球与播放聚合

## 需求背景

当前聊天内的音频来源分散（音频消息播放、BGM 等），且原有“悬浮球”与“音频消息”是两套入口/心智，用户难以快速了解“现在到底有多少音频在播放、分别是什么”。

本变更将“悬浮球”定位为**播放聚合视图**：用于查看当前所有正在播放的音频数量与列表；同时保持音频消息本身仍按消息流独立显示并可单独播放控制。

## 变更内容

1. 新增全局音频播放注册与状态聚合（store + 注册机制）。
2. 新增全局悬浮球：仅在存在播放时展示，显示数量徽标，展开显示列表并支持操作。
3. 将音频消息播放器、通用播放器、角色语音播放器、BGM 播放状态统一纳入聚合。

## 影响范围

- **模块:** Chat、Common Components、BGM
- **文件:**
  - `app/components/common/audioPlaybackStore.ts`
  - `app/components/common/useAudioPlaybackRegistration.ts`
  - `app/components/common/audioFloatingBall.tsx`
  - `app/components/chat/infra/bgm/bgmPlaybackRegistry.tsx`
  - `app/components/common/AudioPlayer.tsx`
  - `app/components/chat/message/media/AudioMessage.tsx`
  - `app/components/Role/RoleInfoCard/AudioPlayer.tsx`
  - `app/components/chat/room/roomWindow.tsx`
  - `app/root.tsx`

## 核心场景

### 需求: 查看所有正在播放的音频
**模块:** Chat

#### 场景: 多音频同时播放
- 允许多个音频同时播放（不互斥打断）
- 悬浮球显示当前正在播放的数量
- 展开后按列表展示每个音频条目，并可暂停/ֹͣ

### 需求: 音频播放消息仍独立显示
**模块:** Chat

#### 场景: 从消息流播放音频
- 音频消息仍按原 UI/交互呈现
- 悬浮球仅作为聚合入口，不替代消息本体

## 风险评估

- **风险:** 不同播放器来源的状态同步不一致（播放/暂停/结束未上报）
- **缓解:** 提供统一注册 hook；BGM 通过桥接组件集中上报；对未知来源保持“仅展示/不强控”的保守策略

