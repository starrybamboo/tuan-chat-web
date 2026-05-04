# 02 编辑器首屏渲染的逻辑

## 核心结论

首屏不是一次普通 React render，而是一个分阶段启动流程：

1. 宿主先显示 skeleton 和 iframe 外壳
2. iframe bootstrap browser runtime
3. runtime 创建 store，并把 description 文档的远端 hydration 交给 workspace 后台完成
4. editor 创建并挂入 DOM
5. 等内容稳定后回传 `render-ready`
6. 宿主再隐藏 skeleton

## 时序图

```mermaid
sequenceDiagram
    participant Host as 宿主
    participant Frame as /blocksuite-frame
    participant Route as FrameClient
    participant Runtime as Runtime
    participant Workspace as Workspace/Store
    participant Editor as Editor DOM

    Host->>Host: 渲染 skeleton + iframe
    Host->>Frame: src 带 query 参数
    Frame->>Route: 解析初始参数
    Route->>Route: ensureBlocksuiteBrowserRuntime()
    Route->>Runtime: 渲染 runtime
    Runtime->>Workspace: 创建 store
    Runtime->>Workspace: 后台远端 hydration
    Runtime->>Editor: 创建 editor DOM
    Editor-->>Runtime: 已挂载
    Runtime-->>Host: render-ready
    Host->>Host: 隐藏 skeleton
```

## 1. 宿主先显示 skeleton

[blocksuiteDescriptionEditor.tsx](../../shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx) 维护：

- `isFrameReady`
- `hasFrameReadyOnce`

策略：

- 首次打开前显示 skeleton
- ready 过一次后，后续切文档尽量不再回到纯骨架态

## 2. 首开 query 会被冻结

[useBlocksuiteFrameInit.ts](../../shared/components/BlockSuite/useBlocksuiteFrameInit.ts) 会用 lazy state 冻结首开参数。

目的：

- 避免 `src` 变化触发整帧重建
- 后续参数改走 `sync-params`

## 3. iframe 先 bootstrap，再进 runtime

[BlocksuiteRouteFrameClient.tsx](../../BlocksuiteRouteFrameClient.tsx) 首先调用 [bootstrap/browser.ts](../../bootstrap/browser.ts)。

这一步会：

- 注入样式
- 注册 core custom elements
- patch `customElements.define`

## 4. store 创建后交给 workspace 后台做远端 hydration

[useBlocksuiteEditorLifecycle.ts](../../useBlocksuiteEditorLifecycle.ts) 不再在启动前额外抢一次 snapshot。

description 文档打开后，会由 workspace 内部的后台远端 hydration 拉取云端内容：

- 启动链路不再额外发一轮首屏 snapshot 请求
- 首屏 warning 不再由“1.2 秒放弃等待、8 秒后请求自身超时”这种双阶段时序触发
- `tcHeader fallback` 只会在后台 hydration 完成后才允许写入，避免把本地兜底内容混进待同步队列

## 5. editor 挂入 DOM 后，才允许 `render-ready`

runtime 会：

1. 创建 store
2. 创建 editor
3. `container.replaceChildren(editor)`
4. 延后一帧通知父层 `render-ready`

如果启动期远端状态异常，还会继续等待补救窗口，再发 `render-ready`。

## 6. 首屏阶段只负责 ready，不再承担高度同步

当前 iframe host 统一运行在 full-only 模式下，宿主必须提供稳定高度链。

[BlocksuiteRouteFrameClient.tsx](../../BlocksuiteRouteFrameClient.tsx) 在首屏阶段只负责：

- 启动 browser runtime
- 接收宿主主题与参数同步
- 在 editor 可见后回传 `render-ready`

## 关键文件

- [blocksuiteDescriptionEditor.tsx](../../shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx)
- [useBlocksuiteFrameInit.ts](../../shared/components/BlockSuite/useBlocksuiteFrameInit.ts)
- [BlocksuiteRouteFrameClient.tsx](../../BlocksuiteRouteFrameClient.tsx)
- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../../BlocksuiteDescriptionEditorRuntime.browser.tsx)
- [useBlocksuiteEditorLifecycle.ts](../../useBlocksuiteEditorLifecycle.ts)
- [blocksuiteEditorLifecycleHydration.ts](../../blocksuiteEditorLifecycleHydration.ts)
