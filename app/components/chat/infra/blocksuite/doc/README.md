# Blocksuite 文档系统（tuan-chat-web）

本文档说明 `app/components/chat/infra/blocksuite` 目录下的 Blocksuite 集成：依赖职责、目录结构、运行时分层，以及当前实现边界。

必读（需求口径与概念对齐）：
- 业务需求说明（后续需求变更都更新这里）：`BUSINESS.md`
- 架构总览与依赖图：`ARCHITECTURE-OVERVIEW.md`
- 可视化架构图：`ARCHITECTURE-DIAGRAM.md`
- Guide 专题入口（按问题拆分的深入说明）：`guide/README.md`
- editor 专区入口：`editor/README.md`
- 业务能力如何接入 editor：`editor/INTEGRATION.md`
- frame 专区入口：`frame/README.md`
- 目录字典（目录职责与源码索引）：`DIRECTORY.md`
- 内部数据结构/术语对照：`INTERNAL-DATA.md`
- 常见问题排查（标题/SlashMenu/Edgeless/样式等）：`TROUBLESHOOTING.md`
- 学习路线（从 BlockSuite 源码到本项目集成）：`LEARNING-PATH.md`
- 历史记录入口：`records/README.md`

## 1. 依赖说明（本次新增/使用）

## 2. 目录结构与入口

### 2.1 编辑器渲染入口（UI）

- app/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx
  - 当前是宿主侧 iframe host 入口
  - 负责拼 iframe URL、主题同步、`postMessage`、loading skeleton 和 mention popover
  - 真正的编辑器运行时在 `/blocksuite-frame` 内部，不再由宿主直接创建 editor/store

### 2.2 Manager（Affine-like supported subset）

- 文件：
  - app/components/chat/infra/blocksuite/manager/store.ts
  - app/components/chat/infra/blocksuite/manager/view.ts
  - app/components/chat/infra/blocksuite/manager/featureSet.ts
  - 用同一份 supported subset 驱动 store/view 装配，避免 `store` 与 `view` 能力边界漂移

> 备注：目前 store 初始化时会创建一个最小的 Affine-like block tree：
> `affine:page -> (affine:surface, affine:note -> affine:paragraph)`

### 2.3 Runtime 与 Editor 调用链

- [useBlocksuiteEditorLifecycle.ts](../useBlocksuiteEditorLifecycle.ts)
  -> [runtimeLoader.browser.ts](../runtime/runtimeLoader.browser.ts)
  -> [createBlocksuiteEditor.browser.ts](../editors/createBlocksuiteEditor.browser.ts)
  -> [createBlocksuiteEditor.client.ts](../editors/createBlocksuiteEditor.client.ts)
  -> [tcAffineEditorContainer.ts](../editors/tcAffineEditorContainer.ts)

分层上：
- Blocksuite 根层承载 frame 接入链路源码
- `runtime/` 只负责浏览器侧 runtime loader
- `space/runtime/` 负责 SpaceWorkspace、远端 source 与 ws 同步
- `editors/` 负责真正的 editor DOM 装配
- `editors/extensions/` 负责 business extension builder 与统一 bundle 协议
- embed block 相关实现已经并入 `editors/extensions/embed/`

### 2.4 Workspace/Doc/Store 运行时（Infra）

- app/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry.ts
  - Space -> Workspace 映射（Demo：workspaceId=`space:${spaceId}`）
- app/components/chat/infra/blocksuite/space/runtime/spaceWorkspace.ts
  - `SpaceWorkspace`：一个 Space 对应一个 root Y.Doc，内部管理多个 docId
  - 数据放置：`rootDoc.getMap('spaces').get(docId)` 的 subdoc 内，subdoc 里维护 `blocks` map
  - 存储：`DocEngine + IndexedDBDocSource`（纯本地）

### 2.5 共享基础件与文档 helper

- app/components/chat/infra/blocksuite/shared/
  - 横切基础件：base64、错误分类、调试开关、perf 打点
- app/components/chat/infra/blocksuite/document/
  - 文档语义 helper：docHeader、docExcerpt
- app/components/chat/shared/components/BlockSuite/
  - 宿主侧 BlockSuite 组件与 mention popover

## 3. 存储与协作能力

- 存储：当前已经包含本地 IndexedDB 与 description 远端 snapshot / updates 组合路径
- 协作：完整的多用户实时协作仍不是本文档承诺范围；现有远端链路主要用于文档冷启动、同步与恢复

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

## 6. 当前实现备注

- iframe 方案的详细链路不再写在本文件里，统一看：
  - [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md)
  - [architecture/FRAME.md](./architecture/FRAME.md)
  - [frame/DEEP-DIVE.md](./frame/DEEP-DIVE.md)
- editor 装配、插件和挂载链路统一看：
  - [editor/README.md](./editor/README.md)
  - [editor/ARCHITECTURE.md](./editor/ARCHITECTURE.md)
  - [editor/INTEGRATION.md](./editor/INTEGRATION.md)
  - [editor/PLUGINS.md](./editor/PLUGINS.md)
  - [editor/MOUNTING.md](./editor/MOUNTING.md)
- 历史记录与阶段性治理，统一看：
  - [records/README.md](./records/README.md)
  - [records/BOUNDARY-UPDATE.md](./records/BOUNDARY-UPDATE.md)
  - [records/MAIN-COMPARISON.md](./records/MAIN-COMPARISON.md)
- 目录职责与路径索引统一看：
  - [DIRECTORY.md](./DIRECTORY.md)

---

## 变更记录（2026-01-05）

- 新增依赖：`@blocksuite/affine`、`@blocksuite/affine-model`、`@blocksuite/affine-shared`、`@blocksuite/affine-components`（均为 0.22.4）
- 重构为 Space=Workspace、多 Doc、本地 IndexedDB 存储
