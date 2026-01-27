# why

## 问题

复制“文档消息”到我的文档/空间侧边栏后，副本文档只有标题，正文为空。

## 根因

- Blocksuite 文档正文的主要 SSOT 是前端的 workspace（IndexedDB）。
- 之前复制逻辑只写了 `/blocksuite/doc` 的远端快照（以及标题相关缓存），但没有把正文 restore 到本地 workspace 的新 doc 上，导致打开时加载到的是空白本地文档。

## 目标

- 复制时以“源文档 full update”为基础，restore 到目标 doc 的本地 workspace，确保正文被复制。
- 同时将目标 doc 的 full update 写入 `/blocksuite/doc`，供其它端恢复/预览。

