# Blocksuite Manager Architecture

## 路径

`app/components/chat/infra/blocksuite/manager/`

## 目标

定义“项目允许启用哪些 Blocksuite/AFFiNE 能力”。

## 当前文件

- `featureSet.ts`
- `store.ts`
- `view.ts`

## 负责的事

- 维护支持能力集合
- 保证 store/view 侧启用边界一致
- 避免能力漂移

## 不负责的事

- 不处理业务 docId
- 不处理远端同步
- 不处理 route / iframe 协议
