# 如何实现（How）

## 1. 数据存储：以 blocksuite 为主体

- 在每个 blocksuite 文档的 `spaceDoc`（Yjs 文档）中新增 `Y.Map`：`tc_header`
  - `title: string`
  - `imageUrl: string`
- 该 map 位于 doc 的快照数据内，随 `/blocksuite/doc` 的 snapshot（`encodeStateAsUpdate(doc.spaceDoc)`）持久化。

## 2. UI：自定义标题条替代 doc-title

- 在 `BlocksuiteDescriptionEditor` 增加 `tcHeader` 配置：
  - 启用时在编辑器壳层渲染“图片+标题”条
  - 并在创建 blocksuite editor 时传入 `disableDocTitle`，过滤掉 `DocTitleViewExtension`，从 specs 层彻底移除 blocksuite 的内置标题 fragment。
- 标题条编辑行为：
  - 输入标题：写入 `tc_header.title`
  - 上传/更换图片：写入 `tc_header.imageUrl`

## 3. blocksuite 内部依赖：同步 workspace meta

- linked-doc/quick-search 等能力会读取 `workspace.meta.title`。
- 因此每次 `tc_header.title` 变化时，同步调用 `ensureDocMeta({ title })` 更新 meta.title。

## 4. iframe 通信：把标题变化同步到宿主

- blocksuite 运行在 `/blocksuite-frame` iframe 内。
- 在 iframe 内监听 `tc_header` 变化并通过 `postMessage` 向父窗口发送：
  - `{ type: "tc-header", docId, entityType, entityId, header }`
- 宿主侧接收消息：
  - 写入 `entityHeaderOverrideStore`（localStorage 持久化）用于乐观显示
  - 同时透传到调用方 `onTcHeaderChange`，由页面决定如何冗余写回 room/space。

## 5. 冗余写回 room/space（由页面负责）

- `RoomSettingWindow`：
  - 接收 `onTcHeaderChange`，防抖调用 `useUpdateRoomMutation` 写回 `room.name/avatar`（description 保持不动）。
- `SpaceSettingWindow`：
  - 接收 `onTcHeaderChange`，更新表单中的 `name/avatar`，复用既有自动保存逻辑写回 `space.name/avatar`。

## 6. 乐观显示

- 新增 `entityHeaderOverrideStore`：
  - key: `${entityType}:${entityId}`
  - value: `{ title, imageUrl, updatedAt }`
- `RoomButton`/`SpaceButton`/`RoomHeaderBar` 的 title/avatar 优先使用 override（存在则覆盖，否则回退到后端 room/space 数据）。

