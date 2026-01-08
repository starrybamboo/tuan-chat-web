# 变更提案: Blocksuite 0.22.4 文档入库（可直接用于本项目）

## 需求背景

当前仓库已引入 Blocksuite 生态（`@blocksuite/*@0.22.4`），并在 `app/components/chat/infra/blocksuite/` 下存在嵌入式编辑器、playground、同步等相关实现与内部说明文档，但信息分散在代码与局部 Markdown 中，缺少一套“对外可用内容”视角的系统文档（包职责、入口、常用能力、典型场景用法），导致后续接入/维护成本偏高。

本变更将把 Blocksuite 相关知识沉淀到知识库（`helloagents/wiki/`）中，形成可检索、可对照代码验证、可随版本升级迭代的文档集合。

## 变更内容

1. 新增 Blocksuite 模块知识库入口：整体概览 + 包职责拆解（严格基于 `0.22.4` 的安装内容与 `exports` 入口）。
2. 为指定的 9 个包（`@blocksuite/affine` 等）分别提供“能直接用”的说明：入口（subpath exports）、常见用途、与本项目的对应使用点。
3. 提供 4 个场景化指南（React + TypeScript）：嵌入编辑器 / 协同同步 / 块渲染 / 导入导出。

## 影响范围

- **模块:** 知识库（`helloagents/wiki/`）
- **文件:** 新增多个 Blocksuite 文档文件；更新知识库索引文件
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: 嵌入编辑器（React + TS）
**模块:** Blocksuite 文档
在 React 组件中创建/挂载 Blocksuite 编辑器容器，配置 extension（如 `EditorSettingExtension`、`ParseDocUrlExtension`、`EmbedSyncedDocConfigExtension` 等），并对接项目侧的 workspace 与导航逻辑。

### 需求: 协同同步
**模块:** Blocksuite 文档
说明 `@blocksuite/sync`/`@blocksuite/store` 的职责边界、DocSource/AwarenessSource 等概念，以及在本项目如何接入（含本地 mock 与 websocket 示例指引）。

### 需求: 块渲染
**模块:** Blocksuite 文档
解释 AFFiNE 风格 blocks 的加载与渲染入口（`@blocksuite/affine` 及其 subpath exports），以及页面/白板（page/edgeless）规格（specs）组合方式。

### 需求: 导入导出
**模块:** Blocksuite 文档
整理 `@blocksuite/affine-shared/adapters` 等相关能力（如 HTML/Notion 适配器等，以 0.22.4 实际导出为准），并给出在本项目可落地的调用路径与注意事项。

## 风险评估

- **风险:** 上游包的 `exports` 数量大（尤其 `@blocksuite/affine`），文档过细会失控
  - **缓解:** 以“对外可用内容”为边界：按入口分组+场景串联；只对本项目会用到的核心入口做展开，其余仅列举并说明用途类别
- **风险:** 版本升级后文档与代码不一致
  - **缓解:** 文档显式标注版本 `0.22.4`，并在文档中记录“如何从 node_modules 校验入口/导出”的方法，便于升级后快速对照更新
