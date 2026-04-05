# Blocksuite 架构总览

这份文档只回答三件事：

1. `blocksuite/` 现在的分层是什么
2. 主要依赖链怎么走
3. 每一层的职责边界是什么

## 分层架构图

```mermaid
flowchart TD
    Host["宿主侧 iframe host<br/>blocksuiteDescriptionEditor.tsx"] --> Route["路由入口<br/>app/routes/blocksuiteFrame.tsx"]
    Route --> FrameRoute["路由协议层（位于 blocksuite 根层）<br/>BlocksuiteRouteFrameClient.tsx"]
    FrameRoute --> RuntimeOrchestrator["runtime 编排层（位于 blocksuite 根层）<br/>BlocksuiteDescriptionEditorRuntime.browser.tsx"]
    RuntimeOrchestrator --> ModeLayer["模式层<br/>useBlocksuiteDocModeProvider.ts"]
    RuntimeOrchestrator --> LifecycleLayer["生命周期层<br/>useBlocksuiteEditorLifecycle.ts"]
    RuntimeOrchestrator --> ModeSyncLayer["模式同步层<br/>useBlocksuiteEditorModeSync.ts"]
    RuntimeOrchestrator --> ViewportLayer["视口层<br/>useBlocksuiteViewportBehavior.ts"]
    RuntimeOrchestrator --> HeaderSyncLayer["tcHeader 同步层<br/>useBlocksuiteTcHeaderSync.ts"]
    RuntimeOrchestrator --> HeaderUI["Header UI<br/>BlocksuiteTcHeader.tsx"]
    LifecycleLayer --> Runtime["runtime/<br/>runtimeLoader.browser.ts"]
    Runtime --> SpaceRuntime["space/runtime/<br/>SpaceWorkspace + remoteDocSource + wsClient"]
    LifecycleLayer --> Editors["editors/<br/>editor 装配层"]
    Editors --> Extensions["editors/extensions/<br/>业务 extension builders"]
    Extensions --> Services["services/<br/>业务 service 适配"]
    Editors --> ManagerView["manager/view.ts<br/>view/spec 能力子集"]
    SpaceRuntime --> ManagerStore["manager/store.ts<br/>store/schema 能力子集"]
    Editors --> Spec["spec/<br/>自定义 elements/spec 注册"]
    Host --> Mention["宿主侧 mention popover<br/>shared/components/BlockSuite"]
```

## 依赖图

```mermaid
flowchart LR
    A["blocksuiteDescriptionEditor.tsx"] --> B["/blocksuite-frame route"]
    B --> C["BlocksuiteRouteFrameClient.tsx"]
    C --> D["BlocksuiteDescriptionEditorRuntime.browser.tsx"]
    D --> E["useBlocksuiteDocModeProvider.ts"]
    D --> F["useBlocksuiteEditorLifecycle.ts"]
    D --> G["useBlocksuiteEditorModeSync.ts"]
    D --> H["useBlocksuiteViewportBehavior.ts"]
    D --> I["useBlocksuiteTcHeaderSync.ts"]
    F --> J["runtimeLoader.browser.ts"]
    J --> K["spaceWorkspaceRegistry.ts"]
    K --> L["space/runtime/spaceWorkspace.ts"]
    L --> M["space/runtime/remoteDocSource.ts"]
    L --> N["space/runtime/blocksuiteWsClient.ts"]
    F --> O["createBlocksuiteEditor.browser.ts"]
    O --> P["createBlocksuiteEditor.client.ts"]
    P --> Q["editors/extensions/*"]
    P --> R["tcAffineEditorContainer.ts"]
    R --> S["BlockStdScope.render()"]
```

## 职责摘要

`document/`、`shared/`、`styles/` 没有继续画进主图，因为它们不是同一条稳定主执行链上的“层”，容易在图里被误读成 `BlocksuiteDescriptionEditorRuntime` 或 `lifecycle` 的直接下级。它们仍然存在，只保留在下面的职责说明里。

- 宿主层  
  只负责创建 iframe、传递参数、同步主题和承接 `postMessage`。

- 路由协议层  
  负责 iframe 内 query 参数解析、宿主消息协议和运行时启动入口。

- runtime 编排层  
  以 `BlocksuiteDescriptionEditorRuntime` 为中心，统一调度 mode、lifecycle、mode sync、viewport、tcHeader sync 和 header UI。

- runtime 内部 hook 分层  
  进一步拆成模式层、生命周期层、模式同步层、视口层、tcHeader 同步层，hook 之间不直接耦合，只由 orchestrator 拼装。

- `BlocksuiteDescriptionEditorRuntime`  
  是唯一 orchestrator，自身不实现底层运行时，只负责把 mode、lifecycle、viewport、tcHeader sync 组合起来。

- `runtime/`  
  负责浏览器侧统一 runtime 入口，不直接承载 `SpaceWorkspace` 底层实现。

- `space/runtime/`  
  负责文档运行时底座：workspace/doc 生命周期、远端 source、ws 同步。

- `editors/`  
  负责把 `store/workspace/docModeProvider` 组装成真正可挂载的 editor DOM。

- `editors/extensions/`  
  负责把业务能力转成 `BlocksuiteExtensionBundle` 并注入 editor。

- `services/`  
  只保留 service 逻辑，不承载 extension builder，不承载 editor DOM 控制器。

- `manager/`  
  负责统一项目允许启用的 Blocksuite 能力子集，分别喂给 store 侧和 view 侧。

- `document/` / `shared/`  
  分别承载文档语义 helper 和横切基础件。

- 宿主侧 `BlockSuite/` 组件目录  
  承载 mention popover 这类必须跟 iframe host 并列渲染的宿主 UI。

## 当前判断

当前架构已经和目录对齐到下面这条规则：

- 根层源码只保留 frame 接入链路
- editor 装配收口在 `editors/`
- 文档运行时底座收口在 `space/runtime/`
- 横切基础件不再散落在根目录

如果后续继续收口，优先遵守这两条：

1. 新增 iframe 接入链路代码，才允许进入 Blocksuite 根层
2. 其他新增源码必须先进明确子域，不再把根层当缓冲区
