# 任务清单: AI生图（NovelAI）测试页

目录: `helloagents/history/2026-01/202601131356_ai_image/`

---

## 1. 前端页面（app）
- [√] 1.1 新增 `/ai-image` 路由并实现测试 UI：`tuan-chat-web/app/routes/aiImage.tsx`
- [√] 1.2 Topbar 增加入口 “AI生图”：`tuan-chat-web/app/components/topbanner/Topbanner.tsx`

## 2. Electron 代理（electron）
- [√] 2.1 新增 IPC：`window.electronAPI.novelaiGenerateImage(...)`（`tuan-chat-web/electron/preload.js`）
- [√] 2.2 主进程实现 NovelAI 请求与 ZIP 解包：`tuan-chat-web/electron/main.cjs`
- [√] 2.3 补齐 TS 类型声明：`tuan-chat-web/app/electron.d.ts`

## 3. 依赖与配置
- [√] 3.1 引入 `fflate` 作为 ZIP 解包依赖：`tuan-chat-web/package.json`、`tuan-chat-web/pnpm-lock.yaml`

## 4. 文档更新（知识库）
- [√] 4.1 更新 `tuan-chat-web/helloagents/CHANGELOG.md`
- [√] 4.2 更新模块文档：`tuan-chat-web/helloagents/wiki/modules/app.md`、`tuan-chat-web/helloagents/wiki/modules/electron.md`

## 5. 质量验证
- [√] 5.1 `pnpm typecheck`
- [√] 5.2 `pnpm lint`

