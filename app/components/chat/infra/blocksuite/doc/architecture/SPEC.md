# Blocksuite Spec Architecture

## 路径

`app/components/chat/infra/blocksuite/spec/`

## 目标

放置项目对 BlockSuite schema、element、custom spec 的注册与扩展。

## 当前文件

- `coreElements.browser.ts`
- `roomMapEmbedConfig.ts`
- `tcMentionElement.client.ts`

## 负责的事

- 核心 element/spec 注册
- 自定义 mention / embed 相关 spec

## 不负责的事

- 不承担业务数据流
- 不承担 iframe 协议与 UI 编排
