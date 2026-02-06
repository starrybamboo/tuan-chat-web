# Blocksuite 文档系统（tuan-chat-web）

本文档说明 `app/components/chat/infra/blocksuite` 目录下的 Blocksuite 集成：依赖职责、目录结构、以及 Demo 阶段（仅本地存储）的实现边界。

必读（需求口径与概念对齐）：
- 业务需求说明（后续需求变更都更新这里）：`BUSINESS.md`
- 内部数据结构/术语对照：`INTERNAL-DATA.md`
- 常见问题排查（标题/SlashMenu/Edgeless/样式等）：`TROUBLESHOOTING.md`
- 学习路线（从 BlockSuite 源码到本项目集成）：`LEARNING-PATH.md`

## 1. 依赖说明（本次新增/使用）

## 2. 目录结构与入口

### 2.1 编辑器渲染入口（UI）

- app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx
  - Props：`{ spaceId, docId, mode?: "page" | "edgeless" }`
  - 通过 `spaceWorkspaceRegistry.getOrCreateSpaceDoc({ spaceId, docId })` 获取 store
  - 使用 starter playground 同款组装方式创建 `affine-editor-container`（page/edgeless specs 来自 `@blocksuite/integration-test/view`）
  - `mode` 由 React state 驱动，并通过 DI override 注入 `DocModeProvider`

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
