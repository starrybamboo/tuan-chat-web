# Blocksuite Styles Architecture

## 路径

- [styles/](../../styles)

## 目标

集中存放 Blocksuite 相关样式资源。

## 当前文件

- [affine-embed-synced-doc-header.css](../../styles/affine-embed-synced-doc-header.css)
- [frameBase.css](../../styles/frameBase.css)
- [tcHeader.css](../../styles/tcHeader.css)

## 负责的事

- 提供 iframe 基础样式
- 提供 tcHeader 样式
- 提供 embed 相关样式覆盖

## 不负责的事

- 不放逻辑代码
- 不把样式副作用散落到 JS 文件里
