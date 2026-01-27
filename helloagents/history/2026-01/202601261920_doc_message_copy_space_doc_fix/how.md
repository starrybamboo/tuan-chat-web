# how

## 修复策略

1. 创建 `space_doc`
   - 调用 `POST /space/doc` 创建文档，拿到 `docId:number`。
   - 构造 blocksuite docId：`buildSpaceDocId({ kind:'independent', docId })` → `sdoc:<id>:description`。
2. 复制内容
   - 从源 docId（`udoc/sdoc/room/space/clue/...`）读取 `/blocksuite/doc` 快照。
   - 写入新文档快照：`setRemoteSnapshot({ entityType:'space_doc', entityId: docId, docType:'description' })`。
3. 更新 sidebarTree
   - GET `/space/sidebarTree` 拿到 `version/treeJson`，向 `cat:docs` 追加 doc 节点（写入 `fallbackTitle/fallbackImageUrl` 缓存），再 PUT 回去（版本冲突重试一次）。
4. 交互
   - 成功后跳转到 `/chat/:spaceId/doc/:docId`（URL 传纯数字 docId，由路由内部映射到 `sdoc:*`）。

