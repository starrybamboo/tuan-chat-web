# 轻量迭代：修复 NovelAPI 代理偶发 500

- [√] 1. dev server (`vite`) 的 `/api/novelapi/*` 转发：改用 `pipeline` 处理流式响应，避免 stream error 导致中间件异常
- [√] 2. `scripts/start.mjs` 的 `/api/novelapi/*` 转发：统一捕获异常并返回 502，避免冒泡到全局 500
- [√] 3. 运行 `pnpm typecheck` 与 ESLint 验证
- [√] 4. 同步知识库与变更记录
