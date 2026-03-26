# Blocksuite 目录字典

本文档给 [blocksuite/](../) 提供一份“目录定义 + 文件索引”。

目标：
- 精确说明每个文件夹的职责边界
- 给出可直接跳转的源码入口

不在本文档展开的内容：
- 架构总览：看 [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md)
- 业务语义：看 [BUSINESS.md](./BUSINESS.md)
- editor 专区：看 [editor/README.md](./editor/README.md)
- editor 业务能力接入：看 [editor/INTEGRATION.md](./editor/INTEGRATION.md)
- frame 深挖：看 [frame/README.md](./frame/README.md)
- 历史记录：看 [records/README.md](./records/README.md)
- 内部数据结构：看 [INTERNAL-DATA.md](./INTERNAL-DATA.md)
- 排障：看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 子目录架构文档索引

只保留“目录内至少有 3 个文件”的架构文档：

- 顶层目录边界：[ROOT.md](./architecture/ROOT.md)
- `description/`：[DESCRIPTION.md](./architecture/DESCRIPTION.md)
- `doc/`：[DOCS.md](./architecture/DOCS.md)
- `editors/`：[EDITORS.md](./architecture/EDITORS.md)
- frame 链路：[FRAME.md](./architecture/FRAME.md)
- `manager/`：[MANAGER.md](./architecture/MANAGER.md)
- `runtime/`：[RUNTIME.md](./architecture/RUNTIME.md)
- `shared/`：[SHARED.md](./architecture/SHARED.md)
- `space/`：[SPACE.md](./architecture/SPACE.md)
- `spec/`：[SPEC.md](./architecture/SPEC.md)
- `styles/`：[STYLES.md](./architecture/STYLES.md)

没有单独架构文档的目录：
- `bootstrap/`
- `document/`
- `services/`
- `test/`

## 顶层目录含义

### [blocksuite/](../)

Blocksuite 集成根目录。

这里放的是三类内容：
- 根层 iframe 接入链路源码与顶层目录边界
- 领域子目录：`description/`、`space/`、`runtime/` 等
- 文档与测试：`doc/`、`test/`

目录划分原则：
- iframe 接入链路源码允许直接放在根层
- 横切基础件进入 `shared/`
- 文档语义 helper 进入 `document/`
- 强业务语义文件放进对应领域目录
- 其他不属于 iframe 接入链路的源码不要回流到根层

## 文件夹字典

### [bootstrap/](../bootstrap)

浏览器侧启动预热层。

这里负责必须提前执行的浏览器初始化，但不承担 editor runtime 编排。

### [description/](../description)

Description 类文档的标识、远端快照和本地 updates 存储层。

对应子文档：[DESCRIPTION.md](./architecture/DESCRIPTION.md)

### [doc/](./)

纯文档目录，不放运行时代码。

对应子文档：[DOCS.md](./architecture/DOCS.md)

### [document/](../document)

文档语义 helper 目录，放 header 与 excerpt 这类不属于 runtime 也不属于 editor 装配的能力。

### [editors/](../editors)

editor 装配层，把 runtime 提供的 `store/workspace` 转成最终可挂载的 editor DOM。

对应子文档：[EDITORS.md](./architecture/EDITORS.md)

### frame 链路源码（位于 [blocksuite/](../) 根层）

iframe 方案专用实现直接位于 Blocksuite 根层。

对应子文档：[FRAME.md](./architecture/FRAME.md)

### [manager/](../manager)

Blocksuite 能力边界管理层。

对应子文档：[MANAGER.md](./architecture/MANAGER.md)

### [runtime/](../runtime)

浏览器侧 runtime 入口目录。

对应子文档：[RUNTIME.md](./architecture/RUNTIME.md)

### [shared/](../shared)

跨多个子域复用的基础件目录。

对应子文档：[SHARED.md](./architecture/SHARED.md)

### [services/](../services)

注入给 Blocksuite editor 的业务服务层。

### [space/](../space)

Space 维度的业务映射层。

对应子文档：[SPACE.md](./architecture/SPACE.md)

### [spec/](../spec)

自定义元素与扩展 spec 注册层。

对应子文档：[SPEC.md](./architecture/SPEC.md)

### [styles/](../styles)

Blocksuite 相关样式资源目录。

对应子文档：[STYLES.md](./architecture/STYLES.md)

### [test/](../test)

Blocksuite 目录内的测试收口目录。

### [doc/editor/](./editor)

editor 装配专题文档目录。

### [doc/frame/](./frame)

frame 专题文档目录。

### [doc/records/](./records)

历史记录目录。

## 根目录说明

根层现在保留一组明确的 iframe 接入链路源码，不再要求“顶层只保留子目录”。

约束是：
- 只有 frame 接入链路源码允许放在根层
- 其他新增源码必须进入明确子域

## 子目录文件索引

### [bootstrap/](../bootstrap)

- [browser.ts](../bootstrap/browser.ts)：浏览器侧 bootstrap 入口

### [description/](../description)

- [descriptionDocDb.ts](../description/descriptionDocDb.ts)：description 文档本地 updates 的 IndexedDB 读写
- [descriptionDocId.ts](../description/descriptionDocId.ts)：description/readme 文档 ID 的构造与解析
- [descriptionDocRemote.ts](../description/descriptionDocRemote.ts)：description 文档远端 snapshot / updates API 封装与缓存

### [doc/](./)

- [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md)：最新分层架构图与依赖图
- [BUSINESS.md](./BUSINESS.md)：Blocksuite 业务需求口径
- [DIRECTORY.md](./DIRECTORY.md)：当前这份目录字典
- [editor/README.md](./editor/README.md)：editor 专区总入口
- [editor/ARCHITECTURE.md](./editor/ARCHITECTURE.md)：editor 分层架构与架构图
- [editor/INTEGRATION.md](./editor/INTEGRATION.md)：业务能力如何接入 Blocksuite editor
- [editor/PLUGINS.md](./editor/PLUGINS.md)：extension/plugin 如何工作与如何新增
- [editor/MOUNTING.md](./editor/MOUNTING.md)：editor 挂载、render 与 web component 链路
- [frame/README.md](./frame/README.md)：frame 专区总入口
- [frame/DEEP-DIVE.md](./frame/DEEP-DIVE.md)：`frame/` 深度链路说明
- [INTERNAL-DATA.md](./INTERNAL-DATA.md)：内部数据模型、术语、结构说明
- [LEARNING-PATH.md](./LEARNING-PATH.md)：学习路线与代码阅读顺序
- [README.md](./README.md)：Blocksuite 文档总入口
- [records/README.md](./records/README.md)：记录目录总入口
- [records/BOUNDARY-UPDATE.md](./records/BOUNDARY-UPDATE.md)：边界版改动说明
- [records/EDITOR-UPDATES.md](./records/EDITOR-UPDATES.md)：editor 结构调整记录
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)：常见问题与排查入口
- [architecture/ROOT.md](./architecture/ROOT.md)：顶层目录边界与收口规则
- [architecture/DESCRIPTION.md](./architecture/DESCRIPTION.md)：`description/` 架构
- [architecture/DOCS.md](./architecture/DOCS.md)：`doc/` 架构
- [architecture/EDITORS.md](./architecture/EDITORS.md)：`editors/` 架构
- [architecture/FRAME.md](./architecture/FRAME.md)：`frame/` 架构
- [architecture/MANAGER.md](./architecture/MANAGER.md)：`manager/` 架构
- [architecture/RUNTIME.md](./architecture/RUNTIME.md)：`runtime/` 架构
- [architecture/SHARED.md](./architecture/SHARED.md)：`shared/` 架构
- [architecture/SPACE.md](./architecture/SPACE.md)：`space/` 架构
- [architecture/SPEC.md](./architecture/SPEC.md)：`spec/` 架构
- [architecture/STYLES.md](./architecture/STYLES.md)：`styles/` 架构

### [document/](../document)

- [docExcerpt.ts](../document/docExcerpt.ts)：从 store 提取摘要文本
- [docHeader.ts](../document/docHeader.ts)：文档 header 的读写、订阅与 fallback 处理

### [editors/](../editors)

- [createBlocksuiteEditor.browser.ts](../editors/createBlocksuiteEditor.browser.ts)：统一创建浏览器侧 Blocksuite editor
- [createBlocksuiteEditor.client.ts](../editors/createBlocksuiteEditor.client.ts)：真正的 editor DOM 装配与扩展 bundle 聚合
- [blocksuiteEditorAssemblyContext.ts](../editors/blocksuiteEditorAssemblyContext.ts)：editor 实例级装配上下文
- [mockServices.ts](../editors/mockServices.ts)：editor 装配时注入的 mock service
- [tcAffineEditorContainer.ts](../editors/tcAffineEditorContainer.ts)：项目自定义 editor container 元素
- [extensions/types.ts](../editors/extensions/types.ts)：extension bundle 协议与合并函数
- [extensions/blocksuiteEditorTitle.ts](../editors/extensions/blocksuiteEditorTitle.ts)：标题读取与 meta 同步辅助
- [extensions/blocksuiteQuickSearchPicker.ts](../editors/extensions/blocksuiteQuickSearchPicker.ts)：quick search picker 的 DOM 控制器实现
- [extensions/embed/embedIframeNoCredentiallessElements.ts](../editors/extensions/embed/embedIframeNoCredentiallessElements.ts)：embed iframe 自定义元素实现
- [extensions/embed/embedIframeNoCredentiallessViewOverride.ts](../editors/extensions/embed/embedIframeNoCredentiallessViewOverride.ts)：embed iframe view override
- [extensions/embed/roomMapEmbedOption.ts](../editors/extensions/embed/roomMapEmbedOption.ts)：room map embed 选项扩展
- [extensions/buildBlocksuiteCoreEditorExtensions.ts](../editors/extensions/buildBlocksuiteCoreEditorExtensions.ts)：core 扩展 builder
- [extensions/buildBlocksuiteQuickSearchExtension.ts](../editors/extensions/buildBlocksuiteQuickSearchExtension.ts)：quick search 扩展 builder
- [extensions/embed/buildBlocksuiteEmbedExtensions.ts](../editors/extensions/embed/buildBlocksuiteEmbedExtensions.ts)：embed 相关扩展 builder
- [extensions/buildBlocksuiteLinkedDocExtensions.ts](../editors/extensions/buildBlocksuiteLinkedDocExtensions.ts)：linked-doc 相关扩展 builder
- [extensions/buildBlocksuiteMentionExtensions.ts](../editors/extensions/buildBlocksuiteMentionExtensions.ts)：mention 相关扩展 builder

### frame 链路源码（位于 [blocksuite/](../) 根层）

- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../BlocksuiteDescriptionEditorRuntime.browser.tsx)：iframe 内 description editor runtime orchestrator
- [BlocksuiteRouteFrameClient.tsx](../BlocksuiteRouteFrameClient.tsx)：iframe route client，处理启动参数、消息桥接和高度同步
- [BlocksuiteTcHeader.tsx](../BlocksuiteTcHeader.tsx)：iframe 内 tcHeader UI
- [blocksuiteEditorLifecycleHydration.ts](../blocksuiteEditorLifecycleHydration.ts)：iframe 启动 hydration 决策与等待逻辑
- [blocksuiteRuntimeTypes.ts](../blocksuiteRuntimeTypes.ts)：runtime hook 共享的 editor handle 与 tcHeader state 类型
- [useBlocksuiteDocModeProvider.ts](../useBlocksuiteDocModeProvider.ts)：page / edgeless 模式 provider
- [useBlocksuiteEditorLifecycle.ts](../useBlocksuiteEditorLifecycle.ts)：editor 生命周期、hydrate、header、render-ready 时序
- [useBlocksuiteEditorModeSync.ts](../useBlocksuiteEditorModeSync.ts)：editor 模式同步与 edgeless 聚焦
- [useBlocksuiteTcHeaderSync.ts](../useBlocksuiteTcHeaderSync.ts)：tcHeader 到 meta / 宿主消息 / 外部回调的同步
- [useBlocksuiteViewportBehavior.ts](../useBlocksuiteViewportBehavior.ts)：iframe 内 viewport / fullscreen 行为

### [manager/](../manager)

- [featureSet.ts](../manager/featureSet.ts)：支持能力集合定义
- [store.ts](../manager/store.ts)：store 侧支持能力装配
- [view.ts](../manager/view.ts)：view/spec 侧支持能力装配

### [runtime/](../runtime)

- [runtimeLoader.browser.ts](../runtime/runtimeLoader.browser.ts)：浏览器侧 runtime loader

### [shared/](../shared)

- [base64.ts](../shared/base64.ts)：`Uint8Array <-> base64` 转换工具
- [blocksuiteDocError.ts](../shared/blocksuiteDocError.ts)：错误类型与可重试判断
- [debugFlags.ts](../shared/debugFlags.ts)：调试开关读取
- [perf.ts](../shared/perf.ts)：Blocksuite 打开链路性能埋点

### [services/](../services)

- [quickSearchService.ts](../services/quickSearchService.ts)：quick search service 接口与适配层
- [tuanChatUserService.ts](../services/tuanChatUserService.ts)：TuanChat 用户服务桥接

### [space/](../space)

- [deleteSpaceDoc.ts](../space/deleteSpaceDoc.ts)：删除 space doc 的业务流程
- [spaceDocId.ts](../space/spaceDocId.ts)：Space 内 docId 构造与解析
- [spaceDocMetaPersistence.ts](../space/spaceDocMetaPersistence.ts)：space doc meta 的本地缓存与标题同步队列
- [spaceWorkspaceRegistry.ts](../space/spaceWorkspaceRegistry.ts)：业务层访问 workspace/doc/meta 的窄接口
- [runtime/blocksuiteWsClient.ts](../space/runtime/blocksuiteWsClient.ts)：SpaceWorkspace 使用的 websocket client
- [runtime/remoteDocSource.ts](../space/runtime/remoteDocSource.ts)：SpaceWorkspace 使用的远端 snapshot/update source
- [runtime/spaceWorkspace.ts](../space/runtime/spaceWorkspace.ts)：SpaceWorkspace 核心运行时，负责 doc/store/source 生命周期

### [spec/](../spec)

- [coreElements.browser.ts](../spec/coreElements.browser.ts)：核心元素/spec 注册
- [roomMapEmbedConfig.ts](../spec/roomMapEmbedConfig.ts)：room map embed spec 配置
- [tcMentionElement.client.ts](../spec/tcMentionElement.client.ts)：tc mention 自定义元素

### [styles/](../styles)

- [affine-embed-synced-doc-header.css](../styles/affine-embed-synced-doc-header.css)：embed synced doc header 样式
- [frameBase.css](../styles/frameBase.css)：iframe 基础样式
- [tcHeader.css](../styles/tcHeader.css)：tcHeader 样式

### [test/](../test)

- [blocksuiteEditorLifecycleHydration.test.ts](../test/blocksuiteEditorLifecycleHydration.test.ts)：iframe 启动 hydration 决策单测

## 如何使用这份字典

如果你要找：
- 总体架构与依赖：优先看 [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md)
- iframe 相关：优先看 [frame/](../frame) 和 [FRAME.md](./architecture/FRAME.md)
- Space / docId / registry：优先看 [space/](../space) 和 [SPACE.md](./architecture/SPACE.md)
- 远端 snapshot / updates：优先看 [description/](../description) 与 [space/runtime/remoteDocSource.ts](../space/runtime/remoteDocSource.ts)
- 共享基础件：优先看 [shared/](../shared) 和 [SHARED.md](./architecture/SHARED.md)
- 文档语义 helper：优先看 [document/](../document)
- mention 宿主 UI：优先看 [blocksuiteDescriptionEditor.tsx](/Users/chxr/Projects/tuan-chat-web/app/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx) 和 [blocksuiteMentionProfilePopover.tsx](/Users/chxr/Projects/tuan-chat-web/app/components/chat/shared/components/BlockSuite/blocksuiteMentionProfilePopover.tsx)
- editor 创建和 embed block 行为：优先看 [editors/](../editors)
- editor 业务插件怎么接：优先看 [editor/INTEGRATION.md](./editor/INTEGRATION.md)
- editor 装配细节、插件规范和挂载链路：优先看 [editor/README.md](./editor/README.md)
- iframe 深度链路：优先看 [frame/DEEP-DIVE.md](./frame/DEEP-DIVE.md)
- 历史治理记录：优先看 [records/README.md](./records/README.md)
- 文档说明：优先看 [doc/](./)

如果后续继续拆目录，更新顺序也要同步：
- 先改 [DIRECTORY.md](./DIRECTORY.md)
- 再改对应子文档
- 新文件必须进入某个明确子域，不要回退到根目录散放
