# api

## 目的

统一管理后端 API 调用、OpenAPI 生成代码，以及 WebSocket 与 React Query 相关 hooks。

## 模块概述

- **职责:** OpenAPI 客户端生成与封装、请求实例、查询/变更 hooks、WS 工具
- **状态:** ?开发中
- **最后更新:** 2025-12-27

## 规范

### OpenAPI 生成

#### TuanChat

- 源文件：`api/tuanchat_OpenAPI.json`
- 命令：`pnpm openapi`
- 生成目录：`api/core`、`api/models`、`api/services`

#### NovelAI

- 源文件：`api/novelai/api.json`
- 生成目录：`api/novelai/`（Fetch 客户端）

约定：生成目录内文件尽量不手工修改；如需定制，优先在 `api/custom`、`api/hooks`、`api/services` 外围封装中实现。

### React Query hooks

约定：新增 hooks 前先全局搜索避免重复；mutation 后记得 invalidate 对应查询（以现有代码模式为准）。

### WebSocket

入口参考：`api/useWebSocket.tsx`。为便于排查未处理类型，可能会在运行时记录调试信息（以源码为准）。

## API 接口

接口清单以 `helloagents/wiki/api.md` 与 OpenAPI 文件为准。

## 数据模型

类型与模型以 `api/models` 为准。

## 依赖

- 后端服务（HTTP/WS）

## 变更历史

（从 `helloagents/history/` 自动补全）
