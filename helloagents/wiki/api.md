# API 手册

## 概述

本项目通过 HTTP API 与后端交互，并使用 WebSocket 接收推送消息。接口与数据结构以 OpenAPI 文件为准，并通过脚本生成客户端代码。

## 认证方式

（待补充：以实际后端约定为准，例如 Cookie/Token 等）

---

## OpenAPI 与客户端生成

- **OpenAPI 源:** `api/tuanchat_OpenAPI.json`
- **生成命令:** `pnpm openapi`
- **生成输出:** `api/core`、`api/models`、`api/services`

---

## 运行时配置（环境变量）

- `VITE_API_BASE_URL`：HTTP API 基础地址
- `VITE_API_WS_URL`：WebSocket 地址
- `VITE_TERRE_URL`：terre 服务地址
- `VITE_TERRE_WS`：terre WS 地址

---

## WebSocket

- 入口/封装参考：`api/useWebSocket.tsx`
- 调试约定：运行时可能会写入 `window.__TC_WS_DEBUG__` 用于记录已处理/未处理类型与最近消息（以源码实现为准）

