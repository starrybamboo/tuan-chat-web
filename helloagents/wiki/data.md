# 数据模型

## 概述

本项目主要消费后端 API 的数据结构；类型定义与模型以 `api/tuanchat_OpenAPI.json` 及生成的 `api/models` 为准。

---

## 前端侧数据与缓存

- **请求缓存:** 统一通过 React Query 管理（hooks 与 invalidate 约定见 `wiki/modules/api.md`）
- **本地状态:** 以现有实现为准（例如 Zustand/React state 等）

---

## Blocksuite（yjs）相关数据

前端侧涉及三类数据：

- **远端快照（cache）**：`/blocksuite/doc` 返回的 snapshot（JSON 字符串）
  - v1：`{ v:1, updateB64, updatedAt }`
  - v2：`{ v:2, updateB64, snapshotServerTime, stateVectorB64?, updatedAt }`
- **远端增量日志（SSOT）**：`/blocksuite/doc_update`（后端表）中按 `serverTime` 追加的 updates
- **离线队列（兜底）**：IndexedDB 中暂存的未发送 updates（WS 不可用时），实现见 `app/components/chat/infra/blocksuite/descriptionDocDb`

## 领域模型（待补充）

建议在后续迭代中，基于 OpenAPI 与实际页面使用情况补全以下实体：

- 用户/认证
- 会话/消息
- 好友/好友申请
- WebGAL/terre 相关数据

