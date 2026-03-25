# Blocksuite Frame Architecture

## 路径

`app/components/chat/infra/blocksuite/frame/`

## 目标

承接 iframe 方案的控制平面与运行时编排。

## 当前文件

- `BlocksuiteRouteFrameClient.tsx`
- `BlocksuiteDescriptionEditorRuntime.browser.tsx`
- `BlocksuiteTcHeader.tsx`
- `blocksuiteEditorLifecycleHydration.ts`
- `useBlocksuiteDocModeProvider.ts`
- `useBlocksuiteEditorLifecycle.ts`
- `useBlocksuiteViewportBehavior.ts`

## 负责的事

- route 参数解析
- iframe 宿主协议
- editor lifecycle 与启动期 hydration
- viewport / fullscreen
- tcHeader UI

## 不负责的事

- 不承担宿主侧 iframe 创建
- 不承载通用 Blocksuite 基础工具

## 深度文档

详细链路与数据流见：

- `app/components/chat/infra/blocksuite/doc/architecture/FRAME-DEEP-DIVE.md`
