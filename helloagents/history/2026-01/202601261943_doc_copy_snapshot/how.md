# how

## 实现

- `ChatFrameContextMenu`：
  - 新增 `ensureReadableSnapshot`：先走 `getRemoteSnapshot`，若为空再 best-effort 判断是否权限错误；不可用则抛错并取消复制。
  - 新增 `patchSnapshotHeader`：用 `yjs` 把源 snapshot update 应用到临时 `Y.Doc`，写入 `tc_header.title/imageUrl` 后重新 `encodeStateAsUpdate`，再写入目标实体。
  - “复制到我的文档”：读取源快照 → 创建 `space_user_doc` → 写入 patched snapshot。
  - “复制到空间侧边栏”：读取源快照 → 创建 `space_doc` → 写入 patched snapshot → 追加 sidebarTree 引用。

## 兼容/安全

- 若源文档没有可复制的远端快照（尚未保存）或无权限读取：直接 toast 提示并取消复制，避免生成“空白副本”。

