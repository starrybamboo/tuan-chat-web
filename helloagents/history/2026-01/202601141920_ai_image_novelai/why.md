# 变更提案: AI 生图模块（NovelAI）重写

## 需求背景

当前 `aiImage` 页面在“模型”下拉项等关键配置上以静态常量为主，无法在运行时根据用户账号/订阅能力动态更新；同时 UI/交互与 `https://novelai.net/image` 存在差距，导致学习成本高、操作分散。

本变更目标是：在 Web 与 Electron 两端同步重写 `aiImage` 模块，使用仓库内 `api/novelai`（OpenAPI 生成客户端/模型类型）作为请求与类型的唯一来源，并将桌面端布局与交互尽量对齐 NovelAI Image。

## 变更内容

1. 重写 `app/routes/aiImage.tsx` 的布局与交互：左侧 tabs、右侧预览、参数折叠/高级设置、拖拽上传、快捷键。
2. 生图调用改为以 `api/novelai` 的请求/类型为准（请求结构对齐 `AiGenerateImageRequest`），并保持 Web 通过同源代理、Electron 通过 IPC 的运行方式。
3. “模型”列表改为运行时拉取（优先从 NovelAI 端返回的数据推导），并提供可控降级策略（当上游不提供可枚举列表时）。
4. 历史仅保留本地 IndexedDB（自动写入/浏览/删除/清空），移除其它与历史无关的保留项。

## 影响范围

- **模块:**
  - `app`（路由页面与交互）
  - `electron`（IPC 能力补齐）
  - `api`（仅引用，不改生成代码）
- **文件:**
  - `app/routes/aiImage.tsx`
  - `app/utils/aiImageHistoryDb.ts`（复用/必要时微调）
  - `app/electron.d.ts`
  - `electron/main.js`
  - `electron/preload.js`
  - `vite.config.ts` / `scripts/start.mjs`（如需扩展代理允许的 NovelAI host）

## 核心场景

### 需求: 桌面端 UI/交互对齐
**模块:** app

#### 场景: 左侧 tabs + 右侧预览
- 左侧按 Prompt / Undesired / Image / History / Connection 分区操作
- 右侧固定展示预览与生成结果，便于对比与快速迭代

#### 场景: 参数折叠/高级设置
- 默认只展示常用参数
- 高级参数在折叠区中配置，避免页面噪音

#### 场景: 快捷键与拖拽
- 支持 `Ctrl+Enter` 触发生成
- 支持拖拽图片到预览区，自动切换到 img2img 并载入源图

### 需求: 模型运行时拉取
**模块:** app / electron

#### 场景: 动态加载模型列表
- 首次进入或 token 变化后，自动拉取模型列表并刷新下拉项
- 当上游无法提供可枚举模型列表时，启用降级策略并提示用户

### 需求: 仅保留本地历史
**模块:** app

#### 场景: 自动写入历史并浏览
- 每次生成成功后自动写入 IndexedDB 历史
- 历史支持点击查看、删除单条、清空

## 风险评估

- **风险:** NovelAI 上游可能不提供“可直接枚举的基础生图模型列表”接口，导致运行时拉取无法 100% 还原官网全部选项。
- **缓解:** 采用“多策略探测 + 降级”方案：优先探测可用列表来源，失败时回落到基于 OpenAPI 枚举/已知模型的安全默认集合，并在 UI 显示降级提示。

