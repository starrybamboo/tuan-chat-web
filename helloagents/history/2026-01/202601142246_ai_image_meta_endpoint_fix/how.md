# 技术设计: AI 生图模型拉取端点修复

## 技术方案

### 核心技术
- React Router（页面路由）
- 同源代理 `/api/novelapi/*`（开发态/本地启动的 NovelAPI proxy）
- Electron IPC（仅 Electron 环境）

### 实现要点
- Web 环境：`loadModelsRuntime` 仅使用 `FALLBACK_META_ENDPOINT = https://api.novelai.net` 请求 `/user/clientsettings` 与 `/user/data`，避免误用 `image` 域名。
- Electron 环境：渲染进程调用 `window.electronAPI.novelaiGetClientSettings` 时传入 `https://api.novelai.net`（或使用主进程默认值），确保 `/user/clientsettings` 始终走 API 域。
- 生图请求：仍通过 `/api/novelapi/ai/generate-image`，并继续使用用户在 Connection 中配置的 `image` endpoint（默认 `https://image.novelai.net`）。

## 安全与性能

- **安全:** 本次仅修正 endpoint 选择逻辑，不新增外部依赖；不在日志中输出 token。
- **性能:** 仅影响模型拉取的 base endpoint，不改变请求次数与数据量。

## 测试与部署

- **测试:** 执行 `pnpm typecheck` 与 `pnpm lint`
- **手动验证:** 打开 `/ai-image`，触发模型拉取，确认请求头 `X-NovelAPI-Endpoint=https://api.novelai.net` 且不再 502
