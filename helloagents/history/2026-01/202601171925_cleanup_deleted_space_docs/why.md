# Why: 解散后仍出现已删除文档

## 问题现象

- 解散房间/空间后，在 blocksuite 的 `@`（Linked Doc）弹窗中仍会出现已删除房间/空间对应的文档条目。

## 根因（以运行时行为为准）

- `@` 弹窗的数据源来自 Blocksuite Workspace 的 `meta.docMetas`（本地 IndexedDB + runtime 缓存）。
- 当前实现中，业务“解散”（后端已删除 room/space 及其 blocksuite_doc）并不会自动清理前端本地 workspace 的 doc meta，因此旧 doc 仍会被列出。
- 房间解散有 WS 推送（type=14），但前端仅刷新 room/space 列表，没有同步清理 Blocksuite doc。
- 空间解散会级联解散房间（会产生房间解散推送），但空间自身的描述文档没有对应推送，需在前端主动清理。

## 目标与成功标准

- 解散房间后：`@` 弹窗不再出现该房间的 `room:<roomId>:description`。
- 解散空间后：`@` 弹窗不再出现该空间的 `space:<spaceId>:description`；空间内房间文档由房间解散推送逐个清理。

