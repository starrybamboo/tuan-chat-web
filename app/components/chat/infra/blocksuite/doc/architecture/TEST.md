# Blocksuite Test Architecture

## 路径

`app/components/chat/infra/blocksuite/test/`

## 目标

把 Blocksuite 目录内的测试统一收口。

## 当前文件

- `blocksuiteEditorLifecycleHydration.test.ts`

## 负责的事

- 保存目录内的单元测试
- 优先承接不需要贴身放到实现文件旁边的测试

## 维护约束

- 新测试优先进入这里
- 如果必须和实现文件同目录，应该说明原因
