# Blocksuite Runtime Architecture

## 路径

- [runtime/](../../runtime)

## 目标

承载 Blocksuite 运行时基础设施。

## 当前文件

- [blocksuiteWsClient.ts](../../runtime/blocksuiteWsClient.ts)
- [remoteDocSource.ts](../../runtime/remoteDocSource.ts)
- [runtimeLoader.browser.ts](../../runtime/runtimeLoader.browser.ts)
- [spaceWorkspace.ts](../../runtime/spaceWorkspace.ts)

## 负责的事

- workspace 生命周期
- doc source 组合
- websocket fanout
- runtime loader 对外收口

## 不负责的事

- 不直接渲染 UI
- 不承担业务 header 组件

## 典型调用方

- [useBlocksuiteEditorLifecycle.ts](../../frame/useBlocksuiteEditorLifecycle.ts)
- [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
- [spaceWorkspaceRegistry.ts](../../space/spaceWorkspaceRegistry.ts)
