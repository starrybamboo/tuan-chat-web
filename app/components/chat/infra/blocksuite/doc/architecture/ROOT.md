# Blocksuite Root Architecture

## 路径

- [blocksuite/](../../)

## 目标

根目录承载 Blocksuite 顶层子目录，以及 iframe 接入链路的直接源码入口。

源码按语义收口后，顶层分工是：
- 根层文件：iframe 接入链路的 route client、runtime orchestrator、lifecycle hooks 与 tcHeader UI
- `shared/`：跨多个子域复用的基础件
- `document/`：文档语义 helper

## 当前目录

- [BlocksuiteRouteFrameClient.tsx](../../BlocksuiteRouteFrameClient.tsx)：iframe route client
- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../../BlocksuiteDescriptionEditorRuntime.browser.tsx)：iframe runtime orchestrator
- [BlocksuiteTcHeader.tsx](../../BlocksuiteTcHeader.tsx)：iframe 内 tcHeader UI
- [blocksuiteEditorLifecycleHydration.ts](../../blocksuiteEditorLifecycleHydration.ts)：启动期 hydration 决策
- [useBlocksuiteDocModeProvider.ts](../../useBlocksuiteDocModeProvider.ts)：mode provider hook
- [useBlocksuiteEditorLifecycle.ts](../../useBlocksuiteEditorLifecycle.ts)：editor lifecycle hook
- [useBlocksuiteViewportBehavior.ts](../../useBlocksuiteViewportBehavior.ts)：viewport/fullscreen hook
- [shared/](../../shared)：共享基础件目录
- [document/](../../document)：文档语义 helper 目录

## 不负责的事

- 不承担 workspace 生命周期
- 不承担 description / space 业务映射
- 不承担 spec 注册和样式资源
- 不承载宿主侧 mention popover UI

## 维护约束

- 只有 iframe 接入链路源码允许放在根层
- 横切基础件放 [shared/](../../shared)
- 文档语义 helper 放 [document/](../../document)
- 宿主侧 mention popover 放回 [BlockSuite/](../../../../shared/components/BlockSuite)
