# Blocksuite Embedded Architecture

## 路径

- [embedded/](../../embedded)

## 目标

服务于非 iframe 的嵌入式编辑器集成。

## 当前文件

- [createEmbeddedAffineEditor.client.ts](../../embedded/createEmbeddedAffineEditor.client.ts)
- [embedIframeNoCredentiallessElements.ts](../../embedded/embedIframeNoCredentiallessElements.ts)
- [embedIframeNoCredentiallessViewOverride.ts](../../embedded/embedIframeNoCredentiallessViewOverride.ts)
- [mockServices.ts](../../embedded/mockServices.ts)
- [roomMapEmbedOption.ts](../../embedded/roomMapEmbedOption.ts)
- [tcAffineEditorContainer.ts](../../embedded/tcAffineEditorContainer.ts)

## 负责的事

- 创建嵌入式 editor container
- 注入 quick search、用户服务、linked-doc 等业务扩展
- 处理 embed iframe 的兼容行为

## 不负责的事

- 不处理 `/blocksuite-frame` 路由
- 不承担 iframe 内高度协议

## 与其他目录的关系

- 依赖 [createBlocksuiteEditor.browser.ts](../../editors/createBlocksuiteEditor.browser.ts) 创建 editor
- 依赖 [quickSearchService.ts](../../services/quickSearchService.ts) 与 [tuanChatUserService.ts](../../services/tuanChatUserService.ts) 提供业务服务
- 依赖 [spec/](../../spec) 注册扩展元素
