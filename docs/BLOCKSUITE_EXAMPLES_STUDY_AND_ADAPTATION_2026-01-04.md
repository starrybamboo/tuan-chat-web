# BlockSuite 示例学习与在 tuan-chat-web 的落地（2026-01-04）

本文记录对 `blocksuite-examples` 中 React 示例的学习结论，并说明 tuan-chat-web 当前的集成方式与关键坑点。

## 1. 参考示例

已参考的示例目录：

- `blocksuite-examples/react-basic`
- `blocksuite-examples/react-indexeddb`
- `blocksuite-examples/react-websocket`

其中 `react-basic` 的核心模式最重要：

1) 初始化 schema + collection
- 使用 `Schema().register(...)`
- 使用 `DocCollection({ schema })`

2) 初始化 doc 的 block 树
- `doc.load(() => { doc.addBlock(...) ... })`

3) 创建并挂载编辑器容器
- 创建一个编辑器 WebComponent（示例里是 `AffineEditorContainer`）
- 在 React 里用 `ref` + `useEffect`：`container.appendChild(editor)`

对应示例源码：
- `react-basic/src/editor/editor.ts`
- `react-basic/src/components/EditorContainer.tsx`

## 2. tuan-chat-web 当前采用的集成方式

由于当前工程依赖中**没有** `@blocksuite/presets`、`@blocksuite/blocks`（示例所用），但已有：

- `@blocksuite/std` / `@blocksuite/store` / `@blocksuite/sync`
- 大量 `@blocksuite/affine-block-*` / `@blocksuite/affine-gfx-*` / `@blocksuite/affine-widget-*`（公开包）

因此我们目前走的是更底层的方案：

- 用 `DocEngine + IndexedDBDocSource + RemoteSnapshotDocSource` 做文档同步
- 用 `StoreContainer` 创建 `Store`
- 用 `BlockStdScope` 渲染 `EditorHost`
- 通过自定义 spec（当前是最小 `tc:*`）注册 schema + view

集成点：
- `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
- `app/components/chat/infra/blocksuite/runtime/descriptionWorkspace.ts`
- `app/components/chat/infra/blocksuite/spec/tcSpec.ts`
- `app/components/chat/infra/blocksuite/spec/tcBlocks.ts`

> 后续会把最小 `tc:*` 替换为 blocksuite 提供的现成 blocks/spec（例如 affine-block-*），从而减少自研 block 代码。

## 3. 与示例模式的对应关系（映射）

示例（react-basic） -> tuan-chat-web

- `Schema + DocCollection` -> 我们当前的 `Workspace(root Y.Doc) + Doc(subdoc) + StoreContainer`
- `doc.load(initBlockTree)` -> `doc.load(() => store.addBlock(...))`
- `AffineEditorContainer` -> `EditorHost`（由 `BlockStdScope.render()` 生成）
- `appendChild(editor)` -> `container.replaceChildren(host)`

## 4. 关键坑点与解决方案

### 4.1 `Illegal constructor`（Lit/ReactiveElement）

现象：
- `TypeError: Illegal constructor`，栈在 `new EditorHost()`。

原因：
- `EditorHost` 继承自 `LitElement`（WebComponent）。如果它没有被 `customElements.define('editor-host', EditorHost)` 注册，直接 `new EditorHost()` 会在浏览器里报 `Illegal constructor`。

解决：
- 在我们自己的 extension 初始化阶段确保注册：
  - `defineOnce('editor-host', EditorHost)`

落地位置：
- `app/components/chat/infra/blocksuite/spec/tcBlocks.ts` 的 `ensureTcBlockElementsDefined()`

### 4.2 编辑器不显示但也不报错（高度为 0）

现象：
- 页面不报错，但编辑器区域白/空。

原因：
- BlockSuite 的 `editor-host` 默认样式包含 `height: 100%`。
- 若父容器没有显式 `height`（只有 `min-height`），则 `100%` 计算结果可能为 `0`，导致不可见。

解决：
- 在挂载时对 `host.style` 做覆盖：
  - `host.style.height = 'auto'`
  - `host.style.minHeight = '8rem'`

落地位置：
- `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`

### 4.3 生命周期：不要手动重复 mount/unmount

原因：
- `EditorHost.connectedCallback()` 内部会调用 `std.mount()`。
- `EditorHost.disconnectedCallback()` 内部会调用 `std.unmount()`。

建议：
- React 侧只负责把 host 插入/移除 DOM，不需要额外调用 `std.mount/unmount`。

## 5. 下一步（按最小可用推进）

1) 保持 description editor 稳定可用（不白屏、可编辑、可持久化/同步）。
2) 用 `@blocksuite/affine-block-*` 现成 blocks/spec 替换最小 `tc:*`（减少自研 block）。
3) 再实现 wrapper：`@` mention 与画布内 embed-doc + sync 外层集成。

