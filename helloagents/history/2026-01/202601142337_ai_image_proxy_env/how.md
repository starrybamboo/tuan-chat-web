# 技术设计: NovelAPI 同源代理支持本机代理（修复 502 超时）

## 技术方案

### 核心技术
- `undici`（Node Fetch 的底层实现，显式使用其 `ProxyAgent`/`Agent`）
- 环境变量约定：
  - `NOVELAPI_PROXY`：优先使用的代理地址
  - 兼容 `HTTPS_PROXY` / `HTTP_PROXY` / `ALL_PROXY`
  - `NOVELAPI_CONNECT_TIMEOUT_MS`：可选，控制连接超时（默认 10000ms）

### 实现要点
- `vite.config.ts`（dev）：在 `tc-novelapi-proxy` middleware 中，为上游请求提供 `dispatcher`：
  - 配置代理时使用 `ProxyAgent({ uri, connect.timeout })`
  - 未配置代理时使用 `Agent({ connect.timeout })`（行为与默认 fetch 直连一致）
- `scripts/start.mjs`（start）：同样为 `/api/novelapi` proxy 增加 `dispatcher` 支持，确保本地静态服务模式也可用；并在启动时读取 `.env` / `.env.local` / `.env.production` / `.env.production.local`（仅在对应变量未显式设置时写入 `process.env`）
- UI 提示：在 `/ai-image` 的 Connection 文案中提示“502 常见原因与环境变量开关”

## 安全与性能

- **安全:** 不在日志/响应中输出 token；代理仅透传 `Authorization` 等必要请求头
- **性能:** 代理走本机代理时可能增加 RTT；通过 `undici` 连接复用减少开销

## 测试与部署

- **测试:** `pnpm typecheck`、`pnpm lint`
- **手动验证:**
  - 直连网络可用时：不设置任何代理变量，应可正常请求（非 502，可能是 401/403/200 取决于 token）
  - 直连受限时：设置 `NOVELAPI_PROXY=http://127.0.0.1:7890`（示例）并重启后，`/api/novelapi/*` 不再因连接超时返回 502
