# 任务清单: AI 生图 Web 默认切回同源代理

Ŀ¼: `helloagents/plan/202601151809_ai_image_default_proxy/`

---

## 1. 默认与持久化
- [√] 1.1 在 `app/routes/aiImage.tsx` 将 Web 默认请求方式设置为 `proxy`
- [√] 1.2 增加 `tc:ai-image:request-mode` 本地持久化（刷新后保持选择）

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/app.md` 与 `helloagents/CHANGELOG.md`

## 3. 质量验证
- [√] 3.1 执行 `pnpm typecheck` / `pnpm lint`

## 4. 迁移归档
- [√] 4.1 迁移方案包到 `helloagents/history/2026-01/`
