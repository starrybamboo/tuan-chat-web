# Blocksuite Editors Architecture

## 路径

`app/components/chat/infra/blocksuite/editors/`

## 目标

把上游 Blocksuite/AFFiNE editor 创建过程封装成项目可复用入口。

## 当前文件

- `createBlocksuiteEditor.browser.ts`

## 负责的事

- 接收 store、workspace、mode provider 等参数
- 组装 editor 实例
- 暴露给 iframe runtime 和 embedded editor 复用

## 不负责的事

- 不管理 route 参数
- 不做 iframe postMessage
- 不做业务 header UI
