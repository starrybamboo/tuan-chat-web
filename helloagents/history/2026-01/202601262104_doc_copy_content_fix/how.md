# how

## 流程调整

1. 生成源文档的 full update
   - 在当前 space 的 Blocksuite workspace 内加载源 doc（必要时先把远端快照 restore 到本地）。
   - 调用 `workspace.encodeDocAsUpdate(sourceDocId)` 得到 full update。
2. 创建目标文档
   - 我的文档：`POST /space/docFolder/doc` → `udoc:<id>:description`
   - 空间侧栏：`POST /space/doc` → `sdoc:<id>:description`
3. 复制正文到本地
   - `workspace.restoreDocFromUpdate({ docId: targetDocId, update: sourceUpdate })`
4. 复制标题/封面
   - 通过 `setBlocksuiteDocHeader` 写入目标 doc 的 `tc_header`（title/imageUrl）
5. 远端落库
   - 将目标 doc 的最终 full update 写入 `/blocksuite/doc`（`entityType=space_user_doc|space_doc`）

