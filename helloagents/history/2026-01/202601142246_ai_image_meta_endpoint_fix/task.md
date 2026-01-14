# 任务清单: AI 生图模型拉取端点修复

目录: `helloagents/plan/202601142246_ai_image_meta_endpoint_fix/`

---

## 1. app
- [√] 1.1 在 `app/routes/aiImage.tsx` 中将模型/设置拉取（`/user/*`）固定走 `https://api.novelai.net`，避免误用 `image` endpoint
- [√] 1.2 在 `app/routes/aiImage.tsx` 中修正 Electron 拉取 clientsettings 的 endpoint 传参，确保走 API endpoint

## 2. 质量与样式
- [√] 2.1 修复 ESLint：移除 `app/components/chat/infra/blocksuite/embedded/tcAffineEditorContainer.ts` 文件末尾多余空行
- [√] 2.2 执行 `pnpm typecheck` 与 `pnpm lint` 验证

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/app.md` 记录 `/user/*` 固定走 API endpoint
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 记录本次修复
- [√] 3.3 更新 `helloagents/history/index.md` 追加本次变更索引

## 4. 安全检查
- [√] 4.1 执行安全检查：不输出 token；不触发生产环境路由（`/ai-image` 仅 dev）
