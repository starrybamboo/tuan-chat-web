# 数据模型

## 概述

本项目主要消费后端 API 的数据结构；类型定义与模型以 `api/tuanchat_OpenAPI.json` 及生成的 `api/models` 为准。

---

## 前端侧数据与缓存

- **请求缓存:** 统一通过 React Query 管理（hooks 与 invalidate 约定见 `wiki/modules/api.md`）
- **本地状态:** 以现有实现为准（例如 Zustand/React state 等）

---

## 领域模型（待补充）

建议在后续迭代中，基于 OpenAPI 与实际页面使用情况补全以下实体：

- 用户/认证
- 会话/消息
- 好友/好友申请
- WebGAL/terre 相关数据

