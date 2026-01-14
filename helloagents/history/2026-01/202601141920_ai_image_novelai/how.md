# 技术设计: AI 生图模块（NovelAI）重写

## 技术方案

### 核心技术
- React Router + React
- Tailwind CSS + daisyUI
- `api/novelai/*`（OpenAPI 生成的模型类型作为请求/响应 SSOT）
- Web：同源代理 `/api/novelapi/*`（Vite dev 与 start server）
- Electron：IPC（`window.electronAPI.*`）转发请求到 NovelAI 端
- 历史：IndexedDB（`app/utils/aiImageHistoryDb.ts`）

### 实现要点

1. **UI 结构对齐**
   - 左侧：Tabs（Prompt / Undesired / Image / History / Connection）
   - 右侧：预览区（结果展示、生成状态、拖拽区域）
   - 常用参数直出；高级参数通过折叠区呈现

2. **生图调用（对齐 OpenAPI 请求结构）**
   - 请求体以 `AiGenerateImageRequest` 为准：
     - `input`、`model`、`action`、`parameters`
   - Web 端通过 `fetch('/api/novelapi/ai/generate-image')` 走同源代理
   - Electron 端通过 `ipcMain.handle('novelai:generate-image')` 直连 endpoint
   - 响应支持 ZIP / 图片二进制，统一在前端转换为 dataUrl

3. **模型列表：运行时拉取（多策略 + 降级）**
   - 优先策略：
     1) 尝试从 NovelAI 端的用户设置/数据中提取可用模型字符串（匹配 `nai-diffusion*` 等模式）
     2) 可选：探测内部/未在 OpenAPI 暴露的模型列表接口（若存在）
   - 降级策略：
     - 回落到 OpenAPI 枚举 `AiGenerateImageRequest.model` + 项目已支持的 NAI4 标识（如上游可用）
   - UI：
     - 当处于降级时，展示轻量提示，避免用户误以为是完整列表

4. **拖拽与快捷键**
   - 预览区支持拖拽图片文件：读取为 base64，自动切换到 img2img
   - `Ctrl+Enter`：触发生成

## 架构决策 ADR

### ADR-001: 以 `api/novelai` 类型作为请求 SSOT
**上下文:** 现有实现存在静态常量与手工拼装参数，易与上游演进不一致。
**决策:** 请求体/核心字段以 `api/novelai/models` 的类型为准，并在必要处用运行时校验兜底。
**理由:** 降低维护成本、减少“文档与实现不一致”的漂移。
**替代方案:** 继续手写请求结构 → 拒绝原因: 维护成本高且易漂移。
**影响:** 需要在 Web/Electron 两端对齐请求结构；生成代码仍保持不手工修改。

### ADR-002: 模型列表采用“多策略探测 + 降级”
**上下文:** OpenAPI 不一定包含最新/全部模型，且上游未必提供可枚举接口。
**决策:** 尝试运行时提取/探测，失败回落到安全默认集合，并在 UI 显示降级提示。
**理由:** 满足“运行时拉取”的目标，同时保证可用性。
**替代方案:** 完全静态列表 → 拒绝原因: 不符合需求。
**影响:** 需要实现一次性的模型解析与缓存；并在 Electron 增加对应 IPC 能力。

## 安全与性能

- **安全:**
  - token 仅保存在内存（React state），不写入 localStorage/IndexedDB
  - 代理侧继续限制可访问的 endpoint host（白名单/模式校验）
  - Electron IPC 参数做基本校验（token/prompt 必填）
- **性能:**
  - 模型列表拉取做缓存（本次页面生命周期内），避免频繁请求
  - 历史列表限量（复用现有最大条数策略）

## 测试与部署

- **测试:**
  - `pnpm lint` / `pnpm typecheck`（以仓库 scripts 为准）
  - 手动：运行 `pnpm dev`，访问 `/ai-image` 验证交互
- **部署:**
  - Web：无需额外部署变更
  - Electron：随 app 打包发布，IPC 变更随版本生效

