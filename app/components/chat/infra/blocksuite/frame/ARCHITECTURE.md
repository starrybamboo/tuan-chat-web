# BlockSuite Frame Architecture

本文档说明 `app/components/chat/infra/blocksuite/frame/` 目录内部的职责划分、数据流和维护约束。

## 目录目标

这个目录只负责 iframe 内部运行时。

它解决的问题有三类：

1. 在 `/blocksuite-frame` 这个隔离页面里启动 BlockSuite 浏览器运行时。
2. 在 iframe 内创建并管理编辑器、文档、模式切换、tcHeader 和全屏行为。
3. 通过 `postMessage` 和宿主 iframe host 双向同步参数、状态和用户动作。

这个目录不负责宿主侧 iframe 创建、骨架屏、主题桥接和 mention popover。那些逻辑在 `app/components/chat/shared/components/BlockSuite/`。

## 文件分层

### Route 壳

- [blocksuiteFrame.tsx](../../../../../routes/blocksuiteFrame.tsx)

职责：

- 提供 `/blocksuite-frame` 路由入口。
- 作为 iframe 页的最外层 route module，把 frame client 暴露给 React Router。
- 依赖 React Router 自带的路由级代码分割，不再额外做 route 内二次懒加载。

### Frame 客户端入口

- [BlocksuiteRouteFrameClient.tsx](./BlocksuiteRouteFrameClient.tsx)

职责：

- 解析 iframe 首开 query 参数，得到 `workspaceId`、`docId`、`spaceId`、`mode`、`tcHeader` 等初始状态。
- 调用 `ensureBlocksuiteBrowserRuntime()` 启动浏览器运行时。
- 订阅 `message`，接收宿主发来的 `theme`、`request-height`、`sync-params`。
- 测量 iframe 实际高度，并把 `height` 回传给宿主。
- 把准备好的参数传给真正的编辑器 runtime。

可以把它理解为 iframe 页面内部的“控制平面”，它不直接创建编辑器，只负责参数装配和协议桥接。

### Runtime orchestrator

- [BlocksuiteDescriptionEditorRuntime.browser.tsx](./BlocksuiteDescriptionEditorRuntime.browser.tsx)

职责：

- 组合 `docModeProvider`、editor lifecycle、viewport 行为和 tcHeader UI。
- 负责云端覆盖、本地 header 同步、宿主回调派发。
- 决定最终渲染结构：根容器、tcHeader、fallback action bar、editor host container。

这里是 frame 目录里的主编排层。它本身不应该重新长回“巨型组件”，新增逻辑优先放进独立 hook 或内部 UI 组件。

### 内部 hook

- [useBlocksuiteDocModeProvider.ts](./useBlocksuiteDocModeProvider.ts)
- [useBlocksuiteEditorLifecycle.ts](./useBlocksuiteEditorLifecycle.ts)
- [useBlocksuiteViewportBehavior.ts](./useBlocksuiteViewportBehavior.ts)

职责拆分：

- `useBlocksuiteDocModeProvider`
  负责 `page/edgeless` 主模式状态、`localStorage` 持久化、`DocModeProvider` 实现和对外 `onModeChange` 通知。
- `useBlocksuiteEditorLifecycle`
  负责 runtime 加载、workspace retain/release、基于 `SpaceDoc.load()` 的启动期 hydrate、store/editor 创建、只读同步、header 订阅、销毁清理。
- `useBlocksuiteViewportBehavior`
  负责模式切换后的 viewport 同步、edgeless 聚焦、浏览器全屏、page 模式底部 spacer、body overflow 锁定。

### 内部 UI 组件

- [BlocksuiteTcHeader.tsx](./BlocksuiteTcHeader.tsx)

职责：

- 渲染封面、标题输入、模式切换按钮、全屏按钮、云端覆盖按钮。
- 通过 `storeRef.current` 写回 doc header。
- 不直接管理 runtime、workspace 或 editor 生命周期。

## 启动链路

整体启动路径如下：

1. 宿主页面创建 iframe，`src` 指向 `/blocksuite-frame?...query`。
2. [blocksuiteFrame.tsx](../../../../../routes/blocksuiteFrame.tsx) 作为独立 route module 被 React Router 加载，并直接渲染 frame client。
3. [BlocksuiteRouteFrameClient.tsx](./BlocksuiteRouteFrameClient.tsx) 读取 query，启动 `ensureBlocksuiteBrowserRuntime()`。
4. runtime bootstrap 成功后，渲染 [BlocksuiteDescriptionEditorRuntime.browser.tsx](./BlocksuiteDescriptionEditorRuntime.browser.tsx)。
5. runtime orchestrator 通过 [useBlocksuiteEditorLifecycle.ts](./useBlocksuiteEditorLifecycle.ts) 加载 store，并优先等待 description 文档的启动期远端 hydrate 落定。
6. hydrate 与 editor 初始化完成后，把 editor 节点挂到 `hostContainerRef`。
7. 首屏内容稳定后，通过 `postMessage` 通知宿主 `render-ready`、`height`、`mode`、`tc-header` 等事件。

## 运行时分层

可以把 iframe 内部理解为四层：

### 1. 参数与协议层

实现文件：

- [BlocksuiteRouteFrameClient.tsx](./BlocksuiteRouteFrameClient.tsx)

核心职责：

- 读取首开 query。
- 监听宿主消息。
- 对外回传 `ready`、`height`、`navigate`、`mode`、`tc-header-change`。

这一层不理解 BlockSuite 内部细节，只理解协议字段。

### 2. 视图编排层

实现文件：

- [BlocksuiteDescriptionEditorRuntime.browser.tsx](./BlocksuiteDescriptionEditorRuntime.browser.tsx)

核心职责：

- 把协议层参数转换成运行时状态。
- 组合 header、editor host 和 action 区域。
- 决定哪些事件需要继续上抛给宿主。

### 3. 编辑器生命周期层

实现文件：

- [useBlocksuiteEditorLifecycle.ts](./useBlocksuiteEditorLifecycle.ts)

核心职责：

- 获取或加载 runtime。
- retain/release workspace。
- 远端 snapshot 快速恢复与延迟恢复。
- 创建 doc store。
- 创建 editor DOM 实例并挂载到 host container。
- 处理只读状态、undo/redo fallback、header 初始化与清理。

这是 frame 目录中最容易引入副作用 bug 的部分，新增逻辑优先和这里对齐。

### 4. 交互与展示增强层

实现文件：

- [useBlocksuiteDocModeProvider.ts](./useBlocksuiteDocModeProvider.ts)
- [useBlocksuiteViewportBehavior.ts](./useBlocksuiteViewportBehavior.ts)
- [BlocksuiteTcHeader.tsx](./BlocksuiteTcHeader.tsx)

核心职责：

- 模式切换与持久化。
- 全屏与 viewport 行为。
- header UI 与 header 数据修改。

## 关键数据流

### Query 参数进入 iframe

宿主首次打开 iframe 时，主要通过 query 传递这些参数：

- `workspaceId`
- `docId`
- `spaceId`
- `variant`
- `readOnly`
- `allowModeSwitch`
- `fullscreenEdgeless`
- `mode`
- `tcHeader`
- `tcHeaderTitle`
- `tcHeaderImageUrl`
- `instanceId`

[BlocksuiteRouteFrameClient.tsx](./BlocksuiteRouteFrameClient.tsx) 用 `readInitialFrameState()` 解析它们。

### 宿主后续同步参数

宿主不是只能靠首开 query 驱动。iframe 启动后，宿主还会继续通过 `sync-params` 做增量同步。

用途：

- 同一个 iframe 内切文档。
- 切只读状态。
- 切换 `tcHeader` fallback 内容。
- 切换模式相关参数。

这样可以避免每次变更都重建 iframe。

### 文档模式流

模式相关状态分成两层：

- `forcedMode`
  外部传入的目标模式，在 `allowModeSwitch=false` 时具有最终控制权。
- `currentMode`
  iframe 内当前生效模式，用于驱动 UI、viewport 和对宿主回传。

[useBlocksuiteDocModeProvider.ts](./useBlocksuiteDocModeProvider.ts) 把 BlockSuite 需要的 `DocModeProvider` 包装成 React 可消费的状态源，并把主模式按 `workspaceId + docId` 存进 `localStorage`。

### tcHeader 数据流

tcHeader 走的是“doc store 为单一事实来源”的模式：

1. editor lifecycle 初始化 store，并先等待 description 文档的启动期 hydrate 在短上限内优先完成。
2. 通过 `subscribeBlocksuiteDocHeader()` 监听 store 中 header 变化。
3. 若启用 tcHeader，只有在启动期 hydrate 已落定，或远端明确没有 header 内容时，才调用 `ensureBlocksuiteDocHeader()` 写入 fallback。
4. runtime orchestrator 收到变化后：
   - 更新 iframe 内部 UI。
   - 调用 `runtime.ensureDocMeta()` 同步标题到 workspace meta。
   - 向宿主发送 `tc-header`。
   - 调用外部 `onTcHeaderChange`。

[BlocksuiteTcHeader.tsx](./BlocksuiteTcHeader.tsx) 只是输入端，不拥有 header 状态本身。

### 云端覆盖流

“云端覆盖”发生在 runtime orchestrator 中：

1. 根据 `docId` 解析出 description key。
2. 调用 `getRemoteSnapshot()` 拉取远端 update。
3. 清空本地离线队列，避免旧 update 反向覆盖。
4. 通过 runtime 获取 workspace。
5. 调用 `replaceDocFromUpdate()` 强制用云端快照替换本地内容。
6. 调用 `triggerReload()` 让 lifecycle hook 整体重建 editor。

这个流程故意没有塞进 `useBlocksuiteEditorLifecycle.ts`，因为它是明确的“用户操作”，不是启动期生命周期逻辑。

## postMessage 协议

frame 目录里所有消息统一使用：

- `tc: "tc-blocksuite-frame"`
- `instanceId`
- `type`

### 宿主发给 iframe

主要消息类型：

- `theme`
  同步 light/dark。
- `request-height`
  让 iframe 重新测量高度。
- `sync-params`
  增量同步文档参数。

### iframe 发给宿主

主要消息类型：

- `ready`
  frame client 完成最基础的协议初始化。
- `render-ready`
  首屏内容已经基本稳定可见。
- `height`
  当前内容高度。
- `mode`
  当前模式变化。
- `navigate`
  需要宿主执行页面跳转。
- `tc-header`
  header 数据已变化。
- `tc-header-change`
  route client 转发给宿主的 header 变化事件。
- `debug-log`
  debug 模式下的调试日志。

## 高度测量策略

iframe 高度不是单纯读 `document.body.scrollHeight`，因为 BlockSuite 混合了 light DOM、shadow DOM 和不同模式下的 viewport。

[BlocksuiteRouteFrameClient.tsx](./BlocksuiteRouteFrameClient.tsx) 现在按 `page/edgeless` 显式分支来测量高度：

- `page` 模式优先测 `.affine-page-root-block-container`，再按需叠加 `doc-title` 和 `.tc-blocksuite-tc-header`。
- `edgeless` 模式优先测 `.affine-edgeless-viewport`。
- 两种模式最终都只兜底到 `documentElement/body.scrollHeight`。
- 用 `MutationObserver + resize + 多个延时点` 避免首屏和异步布局时漏报高度。

## 关键生命周期约束

### runtime 和 workspace

[useBlocksuiteEditorLifecycle.ts](./useBlocksuiteEditorLifecycle.ts) 必须成对处理：

- `runtime.retainWorkspace(workspaceId)`
- `runtime.releaseWorkspace(workspaceId)`

如果新增逻辑提前 `return`，要先检查 release 路径是否仍然成立，否则容易引入 workspace 泄漏。

### store 和 editor

创建顺序不能乱：

1. `runtime.ensureDocMeta()`
2. `runtime.getOrCreateDoc()`
3. `store.load()`
4. 等待 description 文档的启动期远端 hydrate 在短上限内优先完成
5. `store.resetHistory()`
6. 初始化 tcHeader 订阅与 fallback
7. `runtime.createBlocksuiteEditor()`
8. `container.replaceChildren(editor)`

注意：

- lifecycle 不再自己手动 `getRemoteSnapshot() + restoreDocFromUpdate()`。
- description 文档的首屏权威数据由 `SpaceDoc.load()` 内部的远端 hydrate 链路提供。
- `render-ready` 不再等同于“editor DOM 已插入”，而是“首屏内容已经基本稳定”。

销毁时至少要做这些事：

- `unsubscribeHeader?.()`
- `createdEditor?.__tc_dispose?.()`
- `container.replaceChildren()`
- 清掉 `editorRef/storeRef/runtimeRef/docRuntimeRef`

### 只读状态

只读不是一次性配置。因为宿主可以运行时切换 `readOnly`，所以 lifecycle hook 初始化 editor 后，还要通过额外 `useEffect` 持续同步：

- `editor.readOnly`
- `editor.readonly`
- `readonly` attribute

### 模式切换

模式切换也不是纯 UI 状态。它会影响：

- editor 内部 mode
- viewport overflow 策略
- edgeless 聚焦
- page 模式底部 spacer
- 浏览器全屏退出逻辑
- 回传给宿主的 `mode`

因此新增模式相关行为时，优先检查 [useBlocksuiteViewportBehavior.ts](./useBlocksuiteViewportBehavior.ts) 和 [useBlocksuiteDocModeProvider.ts](./useBlocksuiteDocModeProvider.ts)。

## 维护建议

### 适合继续拆分的方向

- 把 `postMessage` 协议类型抽成单独的 `frameProtocol.ts`。
- 把高度测量逻辑从 `BlocksuiteRouteFrameClient.tsx` 抽成 `useFrameHeightReporter()`。
- 把 runtime 内部的“云端覆盖”抽成 `useBlocksuiteCloudRestore()`。

### 不建议回退成旧结构的点

- 不要把 tcHeader UI 再塞回 runtime 主文件。
- 不要把 editor 创建、viewport、副作用和 header 订阅重新揉成一个 `useEffect`。
- 不要让 `BlocksuiteRouteFrameClient.tsx` 直接理解 store/editor 细节。

### 修改时优先遵守的边界

- 协议变化优先改 route client。
- 编辑器创建与恢复逻辑优先改 lifecycle hook。
- 模式与全屏逻辑优先改 viewport hook。
- 头部展示和交互优先改 tcHeader 组件。

## 一句话总结

`frame/` 目录的核心设计是：

把 iframe 页面分成“协议入口”、“运行时编排”、“编辑器生命周期”、“展示增强”四层，让 BlockSuite 这种重副作用系统在 React 里可控地启动、同步、销毁，并且始终能和宿主 iframe 保持稳定通信。
