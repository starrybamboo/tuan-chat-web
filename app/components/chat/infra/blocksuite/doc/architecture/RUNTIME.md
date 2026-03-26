# Blocksuite Runtime Architecture

## 路径

- [runtime/](../../runtime)

## 目标

承载 Blocksuite 运行时基础设施。

## 当前文件

- [runtimeLoader.browser.ts](../../runtime/runtimeLoader.browser.ts)
- [space/runtime/blocksuiteWsClient.ts](../../space/runtime/blocksuiteWsClient.ts)
- [space/runtime/remoteDocSource.ts](../../space/runtime/remoteDocSource.ts)
- [space/runtime/spaceWorkspace.ts](../../space/runtime/spaceWorkspace.ts)

## 负责的事

- runtime loader 对外收口
- 暴露浏览器侧统一 runtime 入口
- 依赖 `space/runtime/` 提供底层 workspace/doc 运行时能力

## 不负责的事

- 不直接渲染 UI
- 不承担业务 header 组件

## 典型调用方

- [useBlocksuiteEditorLifecycle.ts](../../frame/useBlocksuiteEditorLifecycle.ts)
- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../../frame/BlocksuiteDescriptionEditorRuntime.browser.tsx)
