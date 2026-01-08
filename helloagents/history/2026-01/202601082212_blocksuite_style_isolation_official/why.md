# 变更提案: Blocksuite 嵌入场景样式隔离（官方兼容方案）

## 需求背景

Blocksuite（AFFiNE/BlockSuite）在嵌入式场景（如空间描述页、个人简介页）打开后，会出现：
1. 同页其它 UI 的样式/交互被影响（例如 `document.body.style` 被修改、全局 CSS 副作用）。
2. Blocksuite 加载期间出现样式闪烁（加载前后样式突变）。

此前尝试使用 ShadowRoot 承载编辑器实现“强隔离”，但在 Blocksuite 内部 Selection/Range 相关逻辑上触发运行时报错（`WrongDocumentError` 等），影响稳定性。

本变更目标是在**不使用 ShadowRoot 挂载编辑器**的前提下，尽可能达到“同页其它 UI 不受影响”，并保持 Blocksuite 行为与官方实现更一致。

## 变更内容
1. 采用“作用域运行时样式注入”替代 ShadowRoot 挂载：将 `@toeverything/theme` 的 `:root` 变量与 KaTeX 的 `body{counter-reset}` 重写到 `.tc-blocksuite-scope`/`.blocksuite-portal` 范围内。
2. Blocksuite 初始化前预注入运行时样式，降低加载期闪烁与全局污染。
3. 通过 `pnpm.patchedDependencies` 将上游对 `document.body.style` 的关键副作用（cursor/overflow）重定向到 `.tc-blocksuite-scope`/`.blocksuite-portal`。
4. 移除 blocksuite portal 强制 shadowDom 的补丁（恢复官方默认），避免 Shadow DOM 与 Selection/Range 兼容性问题。

## 影响范围
- **模块:** `app`（Blocksuite 集成）
- **文件:**
  - `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - `app/components/profile/profileTab/components/BlocksuiteUserReadme.tsx`
  - `app/components/chat/infra/blocksuite/styles/ensureBlocksuiteRuntimeStyles.ts`
  - `app/components/chat/infra/blocksuite/embedded/blocksuiteStyleIsolation.ts`
  - `patches/@blocksuite__*.patch`、`package.json`、`pnpm-lock.yaml`

## 核心场景

### 需求: 同页其它 UI 不受影响
**模块:** app

#### 场景: 打开空间描述页（Blocksuite 嵌入）
- 预期结果: Blocksuite 初始化/交互期间不修改全局 `:root`/`body` 样式导致的页面整体变化
- 预期结果: 拖拽/弹层期间的 cursor/overflow 等副作用仅在 blocksuite 区域生效

#### 场景: 打开个人简介页（Blocksuite 嵌入）
- 预期结果: 与空间描述页一致，不影响同页其它 UI

### 需求: 加载期间避免闪烁
**模块:** app

#### 场景: 首次进入 Blocksuite 页面
- 预期结果: 在 blocksuite JS 模块动态加载期间，不出现“先污染全局样式再恢复”的闪烁

## 风险评估
- **风险:** 上游包仍可能存在其它全局副作用（新增版本/新模块注入）。
- **缓解:** 关键副作用优先通过 pnpm patch 定点修补；必要时在 `startBlocksuiteStyleIsolation` 增强快照/恢复。

