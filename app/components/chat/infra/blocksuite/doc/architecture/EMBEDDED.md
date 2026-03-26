# Blocksuite Embedded Architecture

## 路径

- [embedded/](../../embedded)

## 目标

承接文档内部 embed block 的项目扩展，而不是顶层 description editor 宿主。

## 当前文件

- [embedIframeNoCredentiallessElements.ts](../../embedded/embedIframeNoCredentiallessElements.ts)
- [embedIframeNoCredentiallessViewOverride.ts](../../embedded/embedIframeNoCredentiallessViewOverride.ts)
- [roomMapEmbedOption.ts](../../embedded/roomMapEmbedOption.ts)

## 负责的事

- 处理文档内部 iframe/embed block 的渲染兼容行为
- 扩展 room map embed 选项
- 为 editor 装配层提供 embed 相关 extension

## 不负责的事

- 不负责顶层 editor DOM 创建
- 不负责 `/blocksuite-frame` 路由
- 不负责宿主侧 iframe host

## 与其他目录的关系

- 被 [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts) 组装进最终 editor
- 依赖 [spec/](../../spec) 注册扩展元素
