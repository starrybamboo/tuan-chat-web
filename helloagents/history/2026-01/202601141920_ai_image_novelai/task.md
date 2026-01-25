# 任务清单: AI 生图模块（NovelAI）重写

目录: `helloagents/plan/202601141920_ai_image_novelai/`

---

## 1. AI Image 页面重写（UI/交互）
- [√] 1.1 在 `app/routes/aiImage.tsx` 中重构为“左侧 tabs + 右侧预览”布局，对齐桌面端交互（拖拽/快捷键/高级参数折叠），验证 why.md#需求-桌面端-ui交互对齐-场景-左侧-tabs--右侧预览
- [√] 1.2 在 `app/routes/aiImage.tsx` 中实现“仅保留 IndexedDB 历史”：生成成功自动写入、历史浏览/删除/清空，移除下载/手动保存等入口，验证 why.md#需求-仅保留本地历史-场景-自动写入历史并浏览

## 2. 模型运行时拉取（Web + Electron）
- [√] 2.1 在 `app/routes/aiImage.tsx` 中实现模型列表“运行时拉取 + 降级提示”，验证 why.md#需求-模型运行时拉取-场景-动态加载模型列表
- [√] 2.2 在 `electron/main.js`、`electron/preload.js`、`app/electron.d.ts` 中增加 IPC：获取模型/设置所需数据（用于 Electron 环境），并在页面中接入，验证 why.md#需求-模型运行时拉取-场景-动态加载模型列表，依赖任务2.1

## 3. 代理与连通性（如需要）
- [√] 3.1 若模型拉取需要访问 `api.novelai.net`，在 `vite.config.ts` 与 `scripts/start.mjs` 中扩展 NovelAPI proxy 允许的 host 白名单，并保持安全校验

## 4. 安全检查
- [√] 4.1 执行安全检查（token 不落盘、endpoint 白名单校验、IPC 入参校验）

## 5. 文档更新
- [√] 5.1 更新 `helloagents/wiki/modules/app.md`（AI 生图测试章节）与 `helloagents/CHANGELOG.md`

## 6. 测试
- [?] 6.1 执行 `pnpm lint` / `pnpm typecheck`（以仓库 scripts 为准），并在 `/ai-image` 做基本手动回归
  > 备注: 已完成 `pnpm lint` 与 `pnpm typecheck`；`/ai-image` 的手动点验需由使用者运行页面确认（涉及 token/上游环境）。
