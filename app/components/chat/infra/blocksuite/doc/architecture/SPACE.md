# Blocksuite Space Architecture

## 路径

- [space/](../../space)

## 目标

把上层业务的 Space 语义翻译成 Blocksuite 运行时可消费的接口。

## 当前文件

- [deleteSpaceDoc.ts](../../space/deleteSpaceDoc.ts)
- [spaceDocId.ts](../../space/spaceDocId.ts)
- [spaceDocMetaPersistence.ts](../../space/spaceDocMetaPersistence.ts)
- [spaceWorkspaceRegistry.ts](../../space/spaceWorkspaceRegistry.ts)

## 负责的事

- 定义 space 体系 docId 规则
- 管理 space doc meta 本地缓存
- 提供业务层访问 workspace/doc/meta 的窄接口
- 处理删除 space doc 的业务流程

## 不负责的事

- 不实现底层 Y.Doc / source 机制
- 不负责 iframe 生命周期

## 与 runtime 的关系

- [spaceWorkspaceRegistry.ts](../../space/spaceWorkspaceRegistry.ts) 是业务层入口
- [spaceWorkspace.ts](../../runtime/spaceWorkspace.ts) 是底层实现
