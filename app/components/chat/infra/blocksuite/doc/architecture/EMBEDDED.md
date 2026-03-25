# Blocksuite Embedded Architecture

## 路径

`app/components/chat/infra/blocksuite/embedded/`

## 目标

服务于非 iframe 的嵌入式编辑器集成。

## 当前文件

- `createEmbeddedAffineEditor.client.ts`
- `embedIframeNoCredentiallessElements.ts`
- `embedIframeNoCredentiallessViewOverride.ts`
- `mockServices.ts`
- `roomMapEmbedOption.ts`
- `tcAffineEditorContainer.ts`

## 负责的事

- 创建嵌入式 editor container
- 注入 quick search、用户服务、linked-doc 等业务扩展
- 处理 embed iframe 的兼容行为

## 不负责的事

- 不处理 `/blocksuite-frame` 路由
- 不承担 iframe 内高度协议

## 与其他目录的关系

- 依赖 `editors/` 创建 editor
- 依赖 `services/` 提供业务服务
- 依赖 `spec/` 注册扩展元素
