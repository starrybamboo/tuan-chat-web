# 消息收发缓存架构审计

作者：starrybamboo <735845305@qq.com>

审计日期：2026-07-06

归档日期：2026-07-06

## 归档位置

这份审计里的长期缓存思想已经归档到项目级 OpenSpec 文档：

- 通用缓存分层原则：`D:/A_collection/tuanchat-docs/openspec/principles/query-cache.md`
- 通用可验收约束：`D:/A_collection/tuanchat-docs/openspec/specs/frontend-data-consistency/spec.md`
- 消息收发链路规格：`D:/A_collection/tuanchat-docs/openspec/specs/chat-frontend-contract/spec.md`

后续讨论 React Query、持久化 read model、WebSocket 事件通道、pending 乐观态、OPFS SQLite 或完整历史消息缓存时，以这些 OpenSpec 文档为事实源。本文件只保留审计来源和跳转，不再维护第二份设计结论。

## 归档摘要

当前产品目标是“文档内容全部走房间 message-stream / 远端消息流”。聊天房间和文档房间共享同一条房间消息流，不能再为文档正文或群聊历史消息维护第二份长期业务真相。

通用缓存边界已经沉淀为“单一事实源，多层职责”：

- 最终真相源负责决定业务事实。
- 持久化 read model 负责首屏恢复、离线读取、断点续拉、索引和去重。
- 当前界面投影负责渲染、排序、选择和 pending 展示。
- pending 乐观态默认只属于当前界面投影；需要跨刷新恢复时，应使用独立 pending outbox。
- WebSocket、浏览器事件和推送只是事件通道，不是长期业务缓存。
- 会话摘要、未读数和最新消息摘要可以缓存，但不能反向成为完整消息流事实源。

消息链路的细节已经进入 `chat-frontend-contract`：历史消息不进入 React Query 长期读缓存，OPFS SQLite `room_messages` 是服务端 `message-stream` 的持久化 read model，pending 乐观消息不得混入已确认消息主缓存。
