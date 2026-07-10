## Why

移动端当前只有图片与房间消息的一部分数据真正落盘，大量业务数据仍停留在 React Query 内存缓存，导致冷启动、切换页面、滑动加载或 WebSocket 更新后反复请求已经加载过的消息、头像元数据、会话与空间/房间数据。

Web 端已经通过官方 sqlite-wasm OPFS SAH pool、CacheStorage、IndexedDB 与 localStorage 建立了更完整的本地持久化层；移动端需要补齐 App 级磁盘缓存能力，让已加载内容可优先从本地恢复，再做增量同步。

## What Changes

- 为移动端建立统一的本地磁盘缓存基础设施，复用 `expo-sqlite` 与现有 `tuanchat-local.db`。
- 将私聊消息、私聊会话、房间消息增量同步状态落盘，避免每次重新进入都全量请求。
- 将空间、房间、消息会话、未读摘要、好友、角色、成员、贴纸、房间 extra、地图与通知首屏等高价值 query 做白名单 snapshot 持久化。
- 扩展移动端媒体文件缓存：图片保持自动缓存；音频、视频、文件按点击或受控预取落盘，并带大小、TTL 与清理策略。
- 统一移动端非敏感 KV 存储，避免继续用 SecureStore 保存高频或较大的普通 JSON；认证 token 继续保留 SecureStore。
- 增加本地缓存的清理、登出隔离、TTL、合并与回退测试。

## Capabilities

### New Capabilities

- `mobile-local-cache`: 移动端统一磁盘缓存、query snapshot、KV、媒体文件缓存与用户域清理能力。
- `mobile-message-persistence`: 移动端房间消息增量同步与私聊消息 SQLite 持久化能力。

### Modified Capabilities

## Impact

- 主要影响 `apps/mobile/src/lib`、`apps/mobile/src/features/messages`、`apps/mobile/src/features/friends`、`apps/mobile/src/features/spaces`、`apps/mobile/src/features/rooms`、`apps/mobile/src/features/roles`、`apps/mobile/src/features/members`、`apps/mobile/src/features/notifications`、`apps/mobile/src/features/chat`。
- 可能扩展 `packages/tuanchat-local-db`，增加私聊消息与 query snapshot repository。
- 继续使用现有依赖 `expo-sqlite`、`expo-file-system`、`expo-secure-store`、`@tanstack/react-query`；不默认引入全量 React Query persister。
- 需要补充移动端缓存单元测试，并运行 `pnpm --filter @tuanchat/mobile typecheck` 与相关 Vitest。
