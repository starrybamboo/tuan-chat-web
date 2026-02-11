# 变更提案: NovelAPI 同源代理支持本机代理（修复 502 超时）

## 需求背景

Web 端通过 `/api/novelapi/*` 同源代理访问 NovelAI，以规避浏览器侧的 CORS/Referer 等限制。但在部分网络环境下，运行 `pnpm dev` / `pnpm start` 的 Node 进程无法直连 `api.novelai.net` / `image.novelai.net`（连接超时），会导致前端请求统一得到 `502 Bad Gateway`。

## 变更内容

1. Ϊ `/api/novelapi/*` 代理增加“可选走本机代理”的能力
2. 保持默认行为不变：未配置代理时仍走直连；配置环境变量后走本机代理
3. 在 `/ai-image` Connection 说明区补充排查提示

## 影响范围

- **模块:** `app`、`tooling`
- **文件:**
  - `vite.config.ts`
  - `scripts/start.mjs`
  - `app/routes/aiImage.tsx`
  - `package.json` / `pnpm-lock.yaml`
- **API:** 无（仅同源代理内部实现增强）
- **数据:** 无

## 核心场景

### 需求: Web 环境可通过代理稳定访问 NovelAI
**模块:** `app`

当 Node 进程无法直连 NovelAI 时：
- 配置 `NOVELAPI_PROXY`（或 `HTTPS_PROXY` / `ALL_PROXY`）后重启 `pnpm dev/start`
- `/api/novelapi/*` 可通过本机代理转发到上游，避免 502 超时

## 风险评估

- **风险:** 新增依赖 `undici`，用于在 Node 侧显式配置代理 dispatcher
- **缓解:** 仅用于本地/开发与 `pnpm start` 的同源代理；不影响前端产物与业务接口
