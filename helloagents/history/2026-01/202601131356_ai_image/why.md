# 变更提案: AI生图（NovelAI）测试页

## 需求背景

现有项目需要一套可在本地快速验证的 NovelAI 生图入口，用于调试 prompt、参数与网络链路。
仓库中已有 `novelai-bot`（Koishi 插件）实现了与 NovelAI 的交互逻辑，本次将其中“与 NAI 交互”的核心流程以适合本项目的方式移植到 `tuan-chat-web`，并提供一个可视化测试页。

## 变更内容

1. 新增路由 `/ai-image`，提供 AI 生图测试 UI。
2. 通过 Electron 主进程代理请求 NovelAI（IPC），避免浏览器侧 CORS/Referer 限制。
3. Topbar 增加入口 “AI生图”，便于快速进入测试页。

## 影响范围

- **模块:**
  - `app`
  - `electron`
  - `helloagents`（知识库）
- **文件:**
  - `tuan-chat-web/app/routes.ts`
  - `tuan-chat-web/app/routes/aiImage.tsx`
  - `tuan-chat-web/app/components/topbanner/Topbanner.tsx`
  - `tuan-chat-web/electron/main.cjs`
  - `tuan-chat-web/electron/preload.js`
  - `tuan-chat-web/app/electron.d.ts`
  - `tuan-chat-web/package.json`
  - `tuan-chat-web/pnpm-lock.yaml`

## 核心场景

### 需求: 新增 AI生图 测试页
**模块:** app
在 UI 中输入 token/prompt/参数并生成图片，用于本地调试。

#### 场景: Electron 环境生成图片
- 用户在 `/ai-image` 输入 NovelAI token 与 prompt，并点击“生成”
- 页面通过 `window.electronAPI.novelaiGenerateImage(...)` 调用主进程
- 主进程请求 NovelAI 并返回图片 data URL
- 页面展示图片并支持下载

#### 场景: Web 环境提示
- 用户在 Web 环境打开 `/ai-image`
- 页面提示需要使用 Electron 进行测试（避免 CORS/Referer 限制）

## 风险评估

- **风险:** token 属于敏感信息，浏览器侧直连 NovelAI 易受 CORS/Referer 限制且不便安全控制。
- **缓解:** 使用 Electron 主进程代理请求；前端不持久化 token；错误提示不回显 token。

