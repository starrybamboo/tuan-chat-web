# 任务清单: NovelAPI 同源代理支持本机代理（修复 502 超时）

目录: `helloagents/plan/202601142337_ai_image_proxy_env/`

---

## 1. 代理实现
- [√] 1.1 在 `vite.config.ts` 的 `/api/novelapi/*` dev middleware 中引入 `undici` dispatcher，支持 `NOVELAPI_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`
- [√] 1.2 在 `scripts/start.mjs` 的 `/api/novelapi/*` proxy 中引入同样的 dispatcher 支持
- [√] 1.3 新增 `NOVELAPI_CONNECT_TIMEOUT_MS`（可选）用于调整连接超时

## 2. UI 说明
- [√] 2.1 在 `app/routes/aiImage.tsx` Connection 文案中补充 502 排查提示

## 3. 质量与验证
- [√] 3.1 执行 `pnpm typecheck` / `pnpm lint`（lint 仅警告无错误）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md` 与 `helloagents/CHANGELOG.md`
- [√] 4.2 更新 `helloagents/history/index.md`

## 5. 安全检查
- [√] 5.1 安全检查：不在代理错误响应中回显 token（仅返回错误摘要）
