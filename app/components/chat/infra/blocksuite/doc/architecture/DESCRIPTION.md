# Blocksuite Description Architecture

## 路径

- [description/](../../description)

## 目标

收口 description/readme 这类业务文档的标识、远端快照和本地 updates 存储。

## 当前文件

- [descriptionDocDb.ts](../../description/descriptionDocDb.ts)：本地 updates IndexedDB
- [descriptionDocId.ts](../../description/descriptionDocId.ts)：description docId 构造与解析
- [descriptionDocRemote.ts](../../description/descriptionDocRemote.ts)：远端 snapshot / updates API 与缓存

## 负责的事

- 识别哪些 docId 属于 description 体系
- 读写 description 文档远端快照
- 缓存和去重远端请求
- 存储离线 updates

## 不负责的事

- 不创建 editor
- 不管理 workspace/store 生命周期
- 不处理 UI header 渲染

## 典型调用方

- [blocksuiteEditorLifecycleHydration.ts](../../blocksuiteEditorLifecycleHydration.ts)
- [remoteDocSource.ts](../../space/runtime/remoteDocSource.ts)
- [deleteSpaceDoc.ts](../../space/deleteSpaceDoc.ts)
