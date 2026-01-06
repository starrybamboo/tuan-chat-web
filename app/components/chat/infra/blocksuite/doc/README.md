# Blocksuite 文档系统（tuan-chat-web）

本文档说明 `app/components/chat/infra/blocksuite` 目录下的 Blocksuite 集成：依赖职责、目录结构、以及 Demo 阶段（仅本地存储）的实现边界。

必读（需求口径与概念对齐）：
- 业务需求说明（后续需求变更都更新这里）：`BUSINESS.md`
- 内部数据结构/术语对照：`INTERNAL-DATA.md`
- 常见问题排查（标题/SlashMenu/Edgeless/样式等）：`TROUBLESHOOTING.md`
- Playground 移植教学（单实例/dedupe/optimizeDeps/为什么核心包不加 /affine）：`PLAYGROUND_MIGRATION_GUIDE.md`
- 学习路线（从 BlockSuite 源码到本项目集成）：`LEARNING-PATH.md`

## 1. 依赖说明（本次新增/使用）

### 核心 Blocksuite（项目已存在）

- `@blocksuite/store@0.22.4`
  - 文档数据层：Block tree、Store、ExtensionType 等。
- `@blocksuite/std@0.22.4`
  - 渲染与编辑宿主：`BlockStdScope`，将 store + view extensions 渲染成 `editor-host`。
- `@blocksuite/sync@0.22.4`
  - 同步引擎：`DocEngine`（Doc source 管线）、`BlobEngine`。
- `@blocksuite/global@0.22.4`
  - 工具与通用能力（例如 `NoopLogger`）。

### AFFiNE 相关（本次新增）

这些包提供“Affine 风格页面”的 blocks、扩展与 UI 组件。

- `@blocksuite/affine@0.22.4`
  - AFFiNE 预设/聚合包（内部依赖若干 affine block/组件包）。
- `@blocksuite/affine-model@0.22.4`
  - AFFiNE 数据模型层相关（用于完整 AFFiNE 体验时的模型能力）。
- `@blocksuite/affine-shared@0.22.4`
  - AFFiNE 共享逻辑/工具集合。
- `@blocksuite/affine-components@0.22.4`
  - AFFiNE UI 组件与 icons 相关依赖。

> 版本要求：本项目 Blocksuite 相关包统一锁定在 `0.22.4`，新增依赖也需对齐，否则容易出现类型/运行时不兼容。

### 依赖包在 AFFiNE 源码中的位置（对照表）

为了在排查问题/阅读源码时能快速定位，本节给出「本项目引用的 `@blocksuite/*` npm 包」在 AFFiNE 仓库（tag：`v0.22.4`）中的源码位置。

说明：
- 下列路径均以 AFFiNE 仓库根目录为基准（即 `AFFiNE/blocksuite/...`）。
- `@blocksuite/affine` 是“聚合入口包”，其内部依赖大量 `@blocksuite/affine-block-*` / widgets / inlines 等子包，分别分布在 `blocksuite/affine/blocks`、`blocksuite/affine/widgets`、`blocksuite/affine/inlines` 等目录。

对照表：
- `@blocksuite/global` → `blocksuite/framework/global`
- `@blocksuite/store` → `blocksuite/framework/store`
- `@blocksuite/std` → `blocksuite/framework/std`
- `@blocksuite/sync` → `blocksuite/framework/sync`
- `@blocksuite/affine` → `blocksuite/affine/all`
- `@blocksuite/affine-model` → `blocksuite/affine/model`
- `@blocksuite/affine-shared` → `blocksuite/affine/shared`
- `@blocksuite/affine-components` → `blocksuite/affine/components`
- `@blocksuite/integration-test` → `blocksuite/integration-test`

### `@blocksuite/affine*` 这几个包里都有什么？

下面的说明按 “它负责什么 + 目录里大概有什么 + 我们什么时候会用到” 的方式写，方便你读源码时快速建立心智模型。

#### `@blocksuite/affine`（聚合入口：Affine 风格 blocks/spec/widgets 一揽子）

- 对应源码目录：`blocksuite/affine/all`
- 定位：**提供 Affine-like 编辑体验的一键入口包**。它并不是“单一模块”，而是把 Affine 生态里常用的 blocks/widgets/inlines/gfx/fragments 等统一通过 subpath exports 对外暴露。
- 它大概包含什么：
  - `./blocks/*`：各类默认 block（paragraph/note/surface/database/table…），通常拆成 `index.ts` / `store.ts` / `view.ts` 三类入口。
  - `./std/*`：将 store + view extensions 组装成可渲染的编辑宿主相关入口。
  - `./ext-loader`：用于加载 Affine 预设扩展集合（我们构造 `AFFINE_*_EXTENSIONS` 时会用到）。
  - `./global/*`、`./store/*`：便捷的再导出入口（但要注意“单实例”原则，避免不同入口拿到两份构造器）。

#### `@blocksuite/affine-model`（模型层：更偏数据/语义，不是 UI）

- 对应源码目录：`blocksuite/affine/model`
- 定位：**Affine 体验的模型/领域层**（偏数据结构、约束、排序等）。从依赖上看，它更多和 `@blocksuite/store`、`yjs`、`zod`、`fractional-indexing` 这一类能力绑定。
- 你什么时候会用到：
  - 你不仅要“渲染一个 editor-host”，还要接入更完整的 Affine 语义/模型能力时。

#### `@blocksuite/affine-shared`（共享逻辑：commands/services/adapters/theme 等）

- 对应源码目录：`blocksuite/affine/shared`
- 定位：**Affine 各模块共享的逻辑与抽象**，介于 model 与 components 之间。
- 它大概包含什么（从 exports 分组就能看出来）：
  - `commands`：统一的命令/操作定义（快捷键、编辑命令等）
  - `services`：共享 Service / DI 相关能力
  - `adapters`：适配器（导入导出/桥接层等）
  - `selection`：选区/选择相关共享逻辑
  - `theme`、`styles`：主题/样式相关的共享约定
  - `types`、`consts`、`utils`：类型/常量/工具

#### `@blocksuite/affine-components`（UI 组件：工具栏/弹层/菜单/选择器）

- 对应源码目录：`blocksuite/affine/components`
- 定位：**Affine 编辑器周边 UI 组件库**，供 blocks/widgets/panels 复用。
- 它大概包含什么：
  - 基础 UI：tooltip/toast/notification/portal/icon-button
  - 交互组件：context-menu/toolbar/drop-indicator/filterable-list
  - 编辑器相关组件：block-selection、linked-doc-title、link-preview 等
  - 颜色/样式组件：color-picker、smooth-corner 等

### 我们的 playground 做了什么（用于调试与复现）

本项目里提到的 “playground” 指的是：把官方 Blocksuite/AFFiNE playground 的 **starter app** 收编到 `infra/blocksuite/playground`，并通过一个路由页面挂载出来，专门用于复现 UI/交互/上游升级问题。

- 调试入口页面：`/doc-test`（文件：`app/routes/docTest.tsx`）
- 工作方式：
  - 页面加载后会动态 import：`@/components/chat/infra/blocksuite/playground/apps/starter/main`
  - 调用 `startStarterPlayground()` 挂载，卸载时调用 `stopStarterPlayground()` 清理。
  - playground 会在 DOM 中使用 `#app` 作为挂载点，并可能向 `document.body` 追加若干调试面板组件（我们在 stop 时做了清理）。
- 数据与存储边界：
  - playground 使用 `@blocksuite/affine/store/test` 提供的 `TestWorkspace` 来快速拉起一套可运行的 workspace/doc。
  - 默认主要用于“交互复现/联调”（例如切换模式、测试 blocks/widgets），并不等同于我们在 `SpaceWorkspace` 里实现的“业务侧本地持久化方案”。

注意：业务侧 Blocksuite 集成（Space/Workspace/Doc/Store 运行时）仍以本 README 的 `2.3` 小节为准；playground 只是调试/学习用的快速入口。

## 2. 目录结构与入口

### 2.1 编辑器渲染入口（UI）

- app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx
  - Props：`{ spaceId, docId, mode?: "page" | "edgeless" }`
  - 通过 `spaceWorkspaceRegistry.getOrCreateSpaceDoc({ spaceId, docId })` 获取 store
  - 根据 `mode` 选择 `AFFINE_PAGE_STD_EXTENSIONS` / `AFFINE_EDGELESS_STD_EXTENSIONS` 渲染 `editor-host`

### 2.1.1 调试页（单入口）

用于“稳定复现 Blocksuite UI/交互问题”的独立页面（挂载收编后的官方 starter playground）。

- 路由：`/doc-test`
- 文件：app/routes/docTest.tsx

说明：
- 该页面主要用于复现/调试 playground 侧问题（例如扩展加载、UI 组件、blocks/widgets 行为）。
- 业务侧存储/运行时请以 `2.3` 小节的 `SpaceWorkspace` 实现为准。

### 2.2 Spec（Affine-like block tree）

- 文件：app/components/chat/infra/blocksuite/spec/affineSpec.ts
  - 使用 `@blocksuite/affine-ext-loader` + 一组 affine block 扩展，构造：
    - `AFFINE_STORE_EXTENSIONS`
    - `AFFINE_PAGE_STD_EXTENSIONS`
    - `AFFINE_EDGELESS_STD_EXTENSIONS`

> 备注：目前 store 初始化时会创建一个最小的 Affine-like block tree：
> `affine:page -> (affine:surface, affine:note -> affine:paragraph)`

### 2.3 Workspace/Doc/Store 运行时（Infra）

- app/components/chat/infra/blocksuite/spaceWorkspaceRegistry.ts
  - Space -> Workspace 映射（Demo：workspaceId=`space:${spaceId}`）
- app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts
  - `SpaceWorkspace`：一个 Space 对应一个 root Y.Doc，内部管理多个 docId
  - 数据放置：`rootDoc.getMap('spaces').get(docId)` 的 subdoc 内，subdoc 里维护 `blocks` map
  - 存储：`DocEngine + IndexedDBDocSource`（纯本地）

## 3. 存储与协作能力（Demo 阶段）

- 存储：仅本地（IndexedDB）
- 协作：Demo 不实现实时协作（后续如需跨设备协作，将另行接入 WebSocket provider）

## 4. TypeScript typecheck stubs 说明

Blocksuite/AFFiNE 某些包会通过 exports 暴露 TS 源码，严格模式下 `tsc` 可能会把 node_modules 源码也纳入类型检查导致大量上游报错。

本项目的策略：
- 使用 `tsconfig.typecheck.json` 的 `compilerOptions.paths` 将部分 affine entrypoints 重定向到本地 stub：
  - app/types/blocksuite/affine-ext-loader.d.ts
  - app/types/blocksuite/affineBlockEntryPoints.d.ts

目的：
- 保证项目自身代码能通过 typecheck，同时避免被上游源码类型问题阻塞。

## 5. 常见问题 / 后续扩展

### 5.1 如何做跨设备实时协作？

需要引入一个 WebSocket 同步通道（provider），把 Yjs updates 在客户端与服务端之间流式转发。

可选路线：
- 在现有后端增加一个 WS endpoint：
  - 方案 A：服务端仅转发 updates（不做 CRDT 存储），持久化仍复用当前 snapshot API
  - 方案 B：服务端同时维护 Y.Doc（完整 yjs server）

### 5.2 React 版本与 peer 依赖告警

安装 `@blocksuite/affine-components` 时会出现 peer 依赖告警（其 icons 依赖要求 React 18）。
当前仅是安装期提示，不代表一定运行失败；如后续出现运行时问题，需要评估：
- 是否将 blocksuite 编辑器相关 UI 下沉到独立 React 18 子应用/iframe
- 或等待上游对 React 19 的适配

---

## 变更记录（2026-01-05）

- 新增依赖：`@blocksuite/affine`、`@blocksuite/affine-model`、`@blocksuite/affine-shared`、`@blocksuite/affine-components`（均为 0.22.4）
- 重构为 Space=Workspace、多 Doc、本地 IndexedDB 存储
- 调试入口统一为：`/doc-test`
