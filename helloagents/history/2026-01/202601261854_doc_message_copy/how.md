# how

## 实现策略

1. 在 `ChatFrameContextMenu` 中识别当前消息是否包含可解析的 Blocksuite `docId`（`parseDescriptionDocId`）。
2. “复制到我的文档”：
   - 调用 `/space/docFolder/doc` 创建 `space_user_doc`。
   - 从源文档读取远端快照（`/blocksuite/doc`），把 full update 写入新文档的快照（写入到新 entityId）。
   - best-effort 写入本地 Workspace 的 doc meta（标题）与 tcHeader 缓存（封面）。
   - 刷新 react-query 缓存并打开“我的文档”抽屉。
3. “复制到空间侧边栏”（KP）：
   - 复用上述复制逻辑创建副本文档。
   - 读取 `/space/sidebarTree`，将新文档节点追加到 `cat:docs`，并写入 `fallbackTitle/fallbackImageUrl` 缓存字段。
   - 写入失败（版本冲突）时自动 GET 最新 version 并重试一次。
   - 成功后跳转到 `/chat/:spaceId/doc/:docId` 打开副本文档。

## 风险与兜底

- 若源文档暂无远端快照（空文档/未落库），仍创建目标文档，但不写入 snapshot（相当于复制空内容）。
- 所有网络/并发失败通过 toast 提示；侧边栏写入做一次重试。

