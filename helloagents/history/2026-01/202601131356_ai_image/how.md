# 技术设计: AI生图（NovelAI）测试页

## 技术方案

### 核心技术

- React Router 路由：新增 `route("ai-image", "routes/aiImage.tsx")`
- Electron IPC：`ipcMain.handle("novelai:generate-image", ...)` + `ipcRenderer.invoke(...)`
- NovelAI 请求：`POST https://image.novelai.net/ai/generate-image`（Bearer token）
- ZIP 解包：使用 `fflate.unzipSync` 提取首张图片并转为 data URL

### 实现要点

- **前端**：`app/routes/aiImage.tsx` 提供表单输入（token/prompt/negative/steps/scale/分辨率等），并展示生成结果与下载按钮。
- **通信**：`electron/preload.js` 暴露 `window.electronAPI.novelaiGenerateImage`，由渲染进程调用。
- **主进程代理**：`electron/main.cjs` 发起请求并处理 zip 响应，统一返回 `{ dataUrl, seed, width, height, model }`。
- **兼容性**：在 Web 环境下仅提示，不尝试直连 NovelAI（浏览器无法自定义 `referer` 且容易触发 CORS）。

## API设计（IPC）

### IPC: `novelai:generate-image`

- **请求（渲染进程 → 主进程）**
  - `token: string`
  - `endpoint?: string`（默认 `https://image.novelai.net`）
  - `prompt: string`
  - `negativePrompt?: string`
  - `model?: string`
  - `width?: number`
  - `height?: number`
  - `steps?: number`
  - `scale?: number`
  - `sampler?: string`
  - `noiseSchedule?: string`
  - `cfgRescale?: number`（NAI v4）
  - `seed?: number`

- **响应（主进程 → 渲染进程）**
  - `dataUrl: string`
  - `seed: number`
  - `width: number`
  - `height: number`
  - `model: string`

## 安全与性能

- **安全:** token 不落盘；错误信息不回显 token；通过主进程代理避免浏览器直连限制。
- **性能:** 仅取 ZIP 中第一张图片用于预览；大图片以 data URL 形式返回用于快速渲染。

## 测试与部署

- **测试:** `pnpm typecheck`、`pnpm lint`
- **部署/运行:** Electron 环境使用 `pnpm electron:dev` 打开 `/ai-image` 进行联调

