# Blocksuite Services Architecture

## 路径

`app/components/chat/infra/blocksuite/services/`

## 目标

承接注入给 Blocksuite editor 的业务服务实现。

## 当前文件

- `quickSearchService.ts`
- `tuanChatUserService.ts`

## 负责的事

- 暴露 editor extension 可消费的服务接口
- 把 TuanChat 业务能力接入 Blocksuite

## 不负责的事

- 不存放通用 util
- 不负责 workspace 生命周期
