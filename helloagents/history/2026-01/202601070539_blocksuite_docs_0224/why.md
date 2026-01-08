# 变更提案: BlockSuite 0.22.4 文档（对外可用内容）

## 需求背景

项目使用 `@blocksuite/*@0.22.4` 作为富文本/白板一体的编辑器能力（AFFiNE 生态的 BlockSuite）。上游包的对外入口较多（大量 subpath exports），在集成与排障时容易出现“找不到入口/不知道该用哪个包/不知道哪些能力是稳定可用的”问题。

本变更的目标是：在本仓库知识库（`helloagents/wiki/`）内提供一组“能直接用”的文档，覆盖以下主题：

1. **嵌入编辑器（React + TS）**：如何在 React 组件中挂载 editor-host，如何组织 workspace/doc。
2. **协同/同步**：sync 管线（DocEngine/BlobEngine 等）在本项目的使用边界与可扩展点。
3. **块渲染**：store + std 的关系、block schema / view extension 的基本拼装方式。
4. **导入/导出**：在 BlockSuite 能力边界内，如何做内容序列化/快照/持久化与对外导出（按 0.22.4 现状给出可行路径）。

## 变更内容

1. 新增 `helloagents/wiki/blocksuite/`：按“包 → 入口 → 可用能力/常见用法”组织文档。
2. 新增 `helloagents/wiki/modules/blocksuite.md` 并加入模块索引：将 Blocksuite 集成作为知识库可检索的子模块。
3. 文档内容严格绑定 `0.22.4`：以本项目 `package.json`/`pnpm-lock.yaml` 与 `node_modules/@blocksuite/*` 的 `package.json#exports` 为事实来源，避免与实际运行偏离。

## 影响范围

- **模块:** `helloagents/wiki/*`
- **文件:** 仅新增/更新知识库文档文件（不改运行时代码）
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: Blocksuite 文档（对外可用内容）
**模块:** blocksuite 文档
在不阅读上游全部源码的前提下，快速定位“应该 import 什么、能用什么、怎么组合”。

#### 场景: 我想在 React 中嵌入编辑器
给出最小可运行的挂载思路，并指向本项目现有集成入口文件。
- 预期结果: 能从文档找到“入口包/关键类型/初始化顺序/本项目示例代码位置”

#### 场景: 我想做协同同步
解释 `@blocksuite/sync` 的抽象边界，并给出与网络 provider 组合的扩展点。
- 预期结果: 能明确“本项目当前做了什么/没做什么/要做到实时协同需要补什么”

#### 场景: 我想理解块渲染与扩展
解释 store（数据）与 std（渲染宿主）的关系，列出常用的 extension/schema/view 概念入口。
- 预期结果: 能知道从哪个包哪个 subpath 找到相关 API 与示例

#### 场景: 我想做导入/导出
按 0.22.4 的真实能力，给出可行的内容持久化/快照/导出路径与注意事项。
- 预期结果: 能明确“导出目标是什么（Doc/blocks/Yjs updates）以及对应实现路径”

## 风险评估

- **风险:** 文档与实际安装版本不一致，导致用法不可用或入口路径错误
- **缓解:** 明确标注版本为 `0.22.4`，并以 `node_modules/@blocksuite/*/package.json#exports` 作为入口索引的唯一事实来源

