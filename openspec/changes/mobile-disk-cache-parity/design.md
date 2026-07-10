## Context

移动端已经具备两类本地能力：图片通过 `mobile-image-cache` 写入 `Paths.cache/mobile-image-cache`，房间消息通过 `mobileRoomMessageCache` 写入 `tuanchat-local.db`。但 QueryClient 仍是内存缓存，私聊、空间、房间、会话、角色、成员、通知、贴纸、房间 extra、地图和角色能力等数据冷启动后都会重新请求。

Web 端对同类问题已有多种持久化策略：房间消息使用官方 sqlite-wasm OPFS SAH pool 写入本地 SQLite，并按 `syncId` 增量同步；WebGAL 资产使用 CacheStorage；UI 状态、文档快照和偏好使用 IndexedDB/localStorage。移动端采用原生 App 更常见的 SQLite/FileSystem 组合。

## Goals / Non-Goals

**Goals:**

- 为移动端提供统一、可测试、可清理的磁盘缓存基础设施。
- 让核心消息数据优先本地恢复，再按增量同步补齐。
- 让高价值 query 通过白名单 snapshot 落盘，降低冷启动和页面切换重复请求。
- 将图片以外的媒体文件纳入受控缓存策略。
- 明确用户域缓存、公共媒体缓存、敏感认证数据的边界。

**Non-Goals:**

- 不实现全量离线编辑或冲突解决系统。
- 不默认持久化整个 React Query cache。
- 不自动下载所有音频、视频和文件原件。
- 不改变服务端 API 契约，除非后续确认移动端缺少必要的增量接口。

## Decisions

1. 使用 SQLite 作为业务数据磁盘层。

   复用 `expo-sqlite` 与 `tuanchat-local.db`，新增 repository 而不是为每个 hook 自建文件格式。SQLite 适合消息、snapshot、TTL、索引和登出清理。备选方案 `expo-secure-store` 不适合大 JSON/高频写；FileSystem JSON 适合文件 cache 元数据但不适合查询和合并。

2. Query snapshot 使用白名单，而不是全量 React Query persister。

   白名单包含空间、房间、会话、好友、角色、成员、贴纸、通知首屏、room extra、room dnd map、role abilities 等明确可恢复的数据。这样可以避免错误态、临时 mutation 状态、巨大分页、敏感信息或过期数据被整体持久化。

3. 消息使用专用表，不走通用 snapshot。

   房间消息已有 `room_messages`，继续使用并升级增量同步。私聊新增 `direct_messages` 表，按 `current_user_id/contact_id/message_id/sync_id` 建索引。消息数据有合并、撤回、已读线和分页需求，专用表比 snapshot 更稳。

4. 文件媒体缓存分层。

   图片继续自动缓存缩略图与预览图。音频、视频、文件默认在点击打开时缓存，未来可按 Wi-Fi 或用户设置预取。所有非图片媒体必须有大小上限、TTL/LRU 清理和远程 URL 回退。

5. 登出清理按数据域区分。

   用户域 snapshot、私聊消息、通知、会话等在登出或切换账号时可清理或按 userId 隔离。公共媒体文件 cache 可保留但必须可清理。认证 token 继续只保留在 SecureStore。

## Risks / Trade-offs

- [Risk] 本地缓存展示过期数据。→ 使用 `updated_at/expires_at`、后台刷新、mutation/WS 成功后同步写盘，并在 UI 保持网络刷新状态。
- [Risk] SQLite 写入过于频繁影响低端机性能。→ 批量 upsert、去重写、限制通知和 snapshot 条数。
- [Risk] 媒体缓存占用过多磁盘。→ 设定全局大小上限、单文件上限、TTL/LRU 清理和失败回退。
- [Risk] 多账号数据串号。→ 所有用户域缓存 key 或表字段必须包含 `userId/currentUserId`，登出清理用户域数据。
- [Risk] 私聊/房间消息合并规则不一致。→ 复用 `@tuanchat/domain` 与 `@tuanchat/query` 现有 merge/mark recalled 逻辑，并补测试。

## Migration Plan

1. 新增 SQLite 表和 repository，保持旧逻辑继续可用。
2. 先接入读本地、网络成功后写本地，不改变 UI 入口。
3. 房间消息从全量同步切换到本地 `maxSyncId` 增量同步。
4. 分批接入 query snapshot 白名单。
5. 增加媒体文件缓存与清理策略。
6. 完成后运行移动端 typecheck、相关 Vitest，并视风险运行全量 `pnpm test`。
