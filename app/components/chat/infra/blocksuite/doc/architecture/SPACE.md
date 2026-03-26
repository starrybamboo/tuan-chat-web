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
- [runtime/blocksuiteWsClient.ts](../../space/runtime/blocksuiteWsClient.ts)
- [runtime/remoteDocSource.ts](../../space/runtime/remoteDocSource.ts)
- [runtime/spaceWorkspace.ts](../../space/runtime/spaceWorkspace.ts)

## 负责的事

- 定义 space 体系 docId 规则
- 管理 space doc meta 本地缓存
- 提供业务层访问 workspace/doc/meta 的窄接口
- 处理删除 space doc 的业务流程
- 承载 SpaceWorkspace 底层运行时实现

## 不负责的事

- 不实现底层 Y.Doc / source 机制
- 不负责 iframe 生命周期

## 与 runtime 的关系

- [spaceWorkspaceRegistry.ts](../../space/spaceWorkspaceRegistry.ts) 是业务层入口
- [runtimeLoader.browser.ts](../../runtime/runtimeLoader.browser.ts) 是浏览器侧统一入口
- [runtime/spaceWorkspace.ts](../../space/runtime/spaceWorkspace.ts) 是底层实现
