# How: 前端在解散时清理 Blocksuite doc meta

## 技术方案

### 1) 解散房间（主动操作）

- 在 `ChatPageContextMenu` 的解散成功回调中，调用 `deleteSpaceDoc({ spaceId, docId })`：
  - `spaceId`: 当前空间
  - `docId`: `room:<roomId>:description`
- `deleteSpaceDoc` 会做 best-effort：
  - 清理离线更新队列（避免后续重新上传）
  - 删除 workspace meta + subdoc（避免 `@` 弹窗仍列出）

### 2) 解散房间（WS 推送 type=14）

- 在 `useWebSocket` 的 type=14 处理逻辑中，同步调用 `deleteSpaceDoc` 清理 `room:<roomId>:description`：
  - 优先从 `getRoomInfo` 缓存推导 `spaceId`
  - 若缺失则对当前缓存出现过的 space 做 best-effort 删除（不存在则 no-op）

### 3) 解散空间（主动操作）

- 空间解散会级联触发房间解散推送，房间文档会被逐个清理。
- 额外在 `SpaceContextMenu` 的解散成功回调中，主动清理空间自身描述文档：
  - `docId`: `space:<spaceId>:description`

### 4) `@`（Linked Doc）标题对齐

- 在 `ChatPage` 中基于房间列表/空间信息，预先将 `meta.title` 对齐到业务标题（房间名/空间名），避免未打开过的文档在 `@` 弹窗中显示 blocksuite 原生标题。
- 在 `SpaceWorkspace` 的 title hydration 中，仅当 `tc_header.title` 存在时才覆盖 `meta.title`；否则保持已有 `meta.title`（通常来自业务标题），避免被 blocksuite 原生标题覆盖。

## 风险与规避

- 风险：在缓存缺失时对多个 space 做 best-effort 删除，可能带来少量额外开销。
- 规避：优先使用 `getRoomInfo` 缓存；best-effort 使用 `Promise.allSettled`，且删除不存在 doc Ϊ no-op。
