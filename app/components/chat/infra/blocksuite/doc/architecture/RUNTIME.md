# Blocksuite Runtime Architecture

## 路径

`app/components/chat/infra/blocksuite/runtime/`

## 目标

承载 Blocksuite 运行时基础设施。

## 当前文件

- `blocksuiteWsClient.ts`
- `remoteDocSource.ts`
- `runtimeLoader.browser.ts`
- `spaceWorkspace.ts`

## 负责的事

- workspace 生命周期
- doc source 组合
- websocket fanout
- runtime loader 对外收口

## 不负责的事

- 不直接渲染 UI
- 不承担业务 header 组件

## 典型调用方

- `frame/useBlocksuiteEditorLifecycle.ts`
- `embedded/createEmbeddedAffineEditor.client.ts`
- `space/spaceWorkspaceRegistry.ts`
