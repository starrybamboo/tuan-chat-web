# 技术设计: AI 生图模块（/ai-image）接入 /api/novelapi 代理并增强能力

## 技术方案

### 核心技术
- Node.js 原生 `http` 服务器（`scripts/start.mjs`）实现同源代理
- Vite 开发服务器 middleware（`vite.config.ts`）实现开发期同源代理
- 前端 React 组件（`app/routes/aiImage.tsx`）统一请求与结果解析
- IndexedDB（`idb`）用于本地历史存储

### 实现要点
- 代理路由约定：`/api/novelapi/<upstreamPath>` → `${endpointBase}/<upstreamPath>`
- 代理请求转发：透传 method/body；注入/覆盖 `referer`、`user-agent`；转发 `authorization`
- 返回处理：透传 status 与关键 headers（`content-type`/`content-disposition`）；正文按二进制返回
- 前端解析：同时支持 `image/*` 与 zip（含 header 缺失时的 magic bytes 兜底），以及文本流中的 base64 data
- img2img：上传图片后生成 base64（不含 data URL 前缀）写入 `parameters.image`，并支持 `strength/noise`
- 历史记录：生成成功后写入 IndexedDB（保存 dataUrl + 元信息），限制条数并支持清理与下载

## 架构决策 ADR

### ADR-001: 代理实现位置选择
**上下文:** Web 环境需要同源代理以规避 NovelAI 的 CORS/Referer 限制；项目当前构建产物为纯静态（`build/server` 不存在），`pnpm start` 走自建静态 server。

**决策:** 在 `scripts/start.mjs`（生产/本地静态服务）与 `vite.config.ts`（开发服务）分别实现 `/api/novelapi` 代理，而非依赖 SSR server 或外部后端。

**理由:**
- 与现有启动方式一致，不引入额外运行时依赖
- 兼容当前 `build/server` 不存在的 SPA 交付形态
- 开发/生产路径一致（同一路径 `/api/novelapi`），前端无需区分环境

**替代方案:**
- 方案A：引入 `@react-router/express` 自建 server 并接管全部路由 → 拒绝原因: 变更面更大，超出本次目标
- 方案B：仅使用 Vite proxy（开发期）→ 拒绝原因: 生产/本地 start 环境无法覆盖

**影响:** 代理能力仅在通过 `pnpm dev` / `pnpm start` 启动的同源服务下可用；如部署到纯静态托管（Nginx/OSS），需额外部署代理服务。

## API 设计

### [ANY] /api/novelapi/*
- **请求:** 透传客户端请求（主要为 `POST /api/novelapi/ai/generate-image`）
- **响应:** 透传 NovelAI 的二进制返回（ZIP / image/* / text/event-stream 等），或在代理异常时返回可读错误文本/JSON

## 安全与性能
- **安全:**
  - 代理侧默认仅允许 `https://image.novelai.net`（或符合 NovelAI tenant 域名规则）的 endpoint
  - 不在服务端/前端持久化 token
- **性能:**
  - 代理响应尽量流式返回（大文件避免多次拷贝）
  - 历史记录限制条数，避免 IndexedDB 无上限增长

## 测试与部署
- **测试:** `pnpm typecheck`；在 Web（`pnpm dev`）与 Electron（`pnpm electron:dev`）分别验证出图、zip/png 解析、img2img、历史与下载
- **部署:** 保持现有 `pnpm build` + `pnpm start` 流程；如未来迁移到纯静态托管需补充独立代理服务

