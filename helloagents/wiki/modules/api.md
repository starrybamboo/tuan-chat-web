# api

## 目的

统一管理后端 API 调用、OpenAPI 生成代码，以及 WebSocket 与 React Query 相关 hooks。

## 模块概述

- **职责:** OpenAPI 客户端生成与封装、请求实例、查询/变更 hooks、WS 工具
- **状态:** ?开发中
- **最后更新:** 2026-01-24

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
- 角色头像更新会先同步替换 `getRoleAvatars` 缓存并触发失效刷新，避免列表显示旧头像。

### WebSocket

入口参考：`api/useWebSocket.tsx`。为便于排查未处理类型，可能会在运行时记录调试信息（以源码为准）。

### 401 / 重新登录

- HTTP：OpenAPI Fetch 客户端在 `api/core/request.ts` 捕获 `401`（排除 `/user/login`、`/user/register`）后会清理本地 `token/uid`，并跳转到 `/login?redirect=...`。
- WebSocket：服务端推送 `type=100`（token失效）时会触发同样的重新登录流程。

## API 接口

接口清单以 `helloagents/wiki/api.md` 与 OpenAPI 文件为准。

## 数据模型

类型与模型以 `api/models` 为准。

## 依赖

- 后端服务（HTTP/WS）

## 变更历史

（从 `helloagents/history/` 自动补全）

## ??????

- Rule/RuleResponse ?? authorId ???
- RulePageRequest ?? authorId ?????????
- ????/?????????? token ??????
## Space 用户文档夹 API（/space/docFolder/*）

- OpenAPI 客户端：`api/services/SpaceUserDocFolderControllerService.ts`
- React Query hooks：`api/hooks/spaceUserDocFolderHooks.ts`
