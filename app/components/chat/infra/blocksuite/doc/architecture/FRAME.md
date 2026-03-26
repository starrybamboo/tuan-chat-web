# Blocksuite Frame Architecture

## 路径

- [frame/](../../frame)

## 目标

承接 iframe 方案的控制平面与运行时编排。

## 当前文件

- [BlocksuiteRouteFrameClient.tsx](../../frame/BlocksuiteRouteFrameClient.tsx)
- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../../frame/BlocksuiteDescriptionEditorRuntime.browser.tsx)
- [BlocksuiteTcHeader.tsx](../../frame/BlocksuiteTcHeader.tsx)
- [blocksuiteEditorLifecycleHydration.ts](../../frame/blocksuiteEditorLifecycleHydration.ts)
- [useBlocksuiteDocModeProvider.ts](../../frame/useBlocksuiteDocModeProvider.ts)
- [useBlocksuiteEditorLifecycle.ts](../../frame/useBlocksuiteEditorLifecycle.ts)
- [useBlocksuiteViewportBehavior.ts](../../frame/useBlocksuiteViewportBehavior.ts)

## 负责的事

- route 参数解析与 iframe 宿主协议
- editor lifecycle 与启动期 hydration
- viewport / fullscreen 行为
- tcHeader UI 与宿主同步
- iframe 内高度测量与 render-ready 时序

## 不负责的事

- 不承担宿主侧 iframe 创建
- 不承载通用 Blocksuite 基础工具

## 内部分层

- [BlocksuiteRouteFrameClient.tsx](../../frame/BlocksuiteRouteFrameClient.tsx)：iframe 页面入口、query 解析、消息桥接、高度回传
- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../../frame/BlocksuiteDescriptionEditorRuntime.browser.tsx)：运行时 orchestrator，组合 mode、viewport、header 与 editor host
- [useBlocksuiteEditorLifecycle.ts](../../frame/useBlocksuiteEditorLifecycle.ts)：runtime 加载、workspace retain/release、store/editor 创建、cleanup
- [blocksuiteEditorLifecycleHydration.ts](../../frame/blocksuiteEditorLifecycleHydration.ts)：启动期 snapshot 决策与等待状态机
- [useBlocksuiteDocModeProvider.ts](../../frame/useBlocksuiteDocModeProvider.ts)：page / edgeless 模式持久化与同步
- [useBlocksuiteViewportBehavior.ts](../../frame/useBlocksuiteViewportBehavior.ts)：viewport、全屏、页面溢出控制
- [BlocksuiteTcHeader.tsx](../../frame/BlocksuiteTcHeader.tsx)：标题、封面、模式按钮、云端覆盖 UI

## 维护约束

- iframe 协议字段变更时，必须同步检查宿主侧 [blocksuiteDescriptionEditor.tsx](../../../../shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx)
- 启动链路调整时，必须同步检查 [blocksuiteEditorLifecycleHydration.test.ts](../../test/blocksuiteEditorLifecycleHydration.test.ts)
