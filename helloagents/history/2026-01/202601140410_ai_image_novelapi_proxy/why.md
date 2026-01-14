# 变更提案: AI 生图模块（/ai-image）接入 /api/novelapi 代理并增强能力

## 需求背景

当前 `/ai-image` 主要面向 Electron 环境，通过 IPC 由主进程代理访问 NovelAI，以规避浏览器端的 CORS/Referer 限制。

在纯 Web 环境下，前端直连 `https://image.novelai.net/ai/generate-image` 往往会被 CORS/Referer 拦截，导致无法正常出图；同时页面缺少 img2img、历史保存、下载等能力，调试与复用成本较高。

## 产品分析

### 目标用户与场景
- **用户群体:** 开发/测试人员、内容创作者（需要快速验证提示词与参数组合）
- **使用场景:** 仅 Web 环境下测试 NovelAI 出图、在 Electron 与 Web 间保持一致的出图能力、对比不同参数的效果
- **核心痛点:** Web 环境请求失败（CORS/Referer）；缺少 img2img；缺少可追溯的历史与便捷下载

### 价值主张与成功指标
- **价值主张:** 同一套 `/ai-image` 页面在 Web/Electron 环境都能稳定出图，并提供更完整的试验闭环（img2img/历史/下载/错误一致）
- **成功指标:**
  - Web/Electron 均可成功生成图片
  - ZIP/PNG 等返回格式均能被正确解析并展示
  - img2img 能上传图片并参与生成
  - 生成历史可保存、可查看、可下载

### 人文关怀
页面不持久化保存用户 token；历史记录默认仅保存在本地浏览器（IndexedDB）且可一键清空，避免无意间长期保留敏感内容。

## 变更内容
1. 新增 `/api/novelapi/*` 本地代理：在 Web 环境通过同源代理访问 NovelAI，注入必要的 Referer/User-Agent 并转发二进制结果。
2. 更新 `/ai-image`：统一请求路径（Web 走代理、Electron 走 IPC），补齐/调整生图参数与模型列表，新增 img2img、历史保存与下载。
3. 统一错误处理：对 Web 代理与 Electron IPC 的错误进行一致化展示，并增强返回格式识别（ZIP/图片/文本流）。

## 影响范围
- **模块:**
  - Web 运行时启动脚本（`scripts/start.mjs`）
  - Vite 开发服务器（`vite.config.ts`）
  - AI 生图页面（`app/routes/aiImage.tsx`）
  - Electron 主进程（`electron/main.cjs`）与类型声明（`app/electron.d.ts`）
  - NovelAI OpenAPI 客户端（`api/novelai/*`，仅做必要修复以便可被前端类型引用）
- **文件:** 见上述模块
- **API:** 新增本地同源代理路由：`/api/novelapi/*`
- **数据:** 新增浏览器本地 IndexedDB 存储（AI 生图历史）

## 核心场景

### 需求: Web 环境可通过代理稳定出图
**模块:** Web 启动与代理

#### 场景: Web 端点击“生成”
Web 环境下从 `/api/novelapi/ai/generate-image` 获取结果。
- 预期结果: 请求不被 CORS/Referer 限制拦截，页面可展示生成结果

### 需求: Electron 环境保持可出图且解析 ZIP/图片
**模块:** Electron IPC 代理

#### 场景: Electron 内点击“生成”
- 预期结果: 通过 IPC 代理请求 NovelAI，结果正常展示；ZIP/PNG 返回均可解析

### 需求: 支持 img2img、历史保存与下载
**模块:** /ai-image 页面

#### 场景: 上传图片进行 img2img
- 预期结果: 可选择源图并设置 strength/noise 等参数，生成结果可展示

#### 场景: 保存历史并下载
- 预期结果: 生成成功后可保存到本地历史列表，点击可查看并下载

## 风险评估
- **风险:** 代理端点若支持任意 endpoint，可能造成开放代理/SSRF 风险
- **缓解:** 代理侧对 endpoint 做白名单/模式校验，默认仅允许 `https://image.novelai.net`（或符合 NovelAI tenant 域名规则）；不落盘保存 token

