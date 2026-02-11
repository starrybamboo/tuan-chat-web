# 任务清单: AI 生图调试增强（token 持久化 + 开发环境路由）

Ŀ¼: `helloagents/plan/202601142115_ai_image_dev_only/`

---

## 1. 本地调试便利性
- [√] 1.1 在 `app/routes/aiImage.tsx` 中实现 NovelAI token 的本地持久化（localStorage），并提供清除入口（默认回填），用于调试便利

## 2. 开发环境路由限制
- [√] 2.1 在 `app/routes.ts` 中将 `/ai-image` 路由限制为仅开发环境注册；生产构建不包含该路由

## 3. 安全检查
- [√] 3.1 执行安全检查：仅在 dev 路由可用前提下持久化 token；避免在非浏览器环境访问 localStorage

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md` 与 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 执行 `pnpm lint` / `pnpm typecheck`
