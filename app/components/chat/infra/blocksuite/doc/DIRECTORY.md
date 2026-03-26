# Blocksuite 目录字典

本文档给 [blocksuite/](../) 提供一份“目录定义 + 文件索引”。

目标：
- 精确说明每个文件夹的职责边界
- 给出可直接跳转的源码入口

不在本文档展开的内容：
- 业务语义：看 [BUSINESS.md](./BUSINESS.md)
- 内部数据结构：看 [INTERNAL-DATA.md](./INTERNAL-DATA.md)
- 排障：看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 子目录架构文档索引

只保留“目录内至少有 3 个文件”的架构文档：

- 根目录共享基础件：[ROOT.md](./architecture/ROOT.md)
- `description/`：[DESCRIPTION.md](./architecture/DESCRIPTION.md)
- `doc/`：[DOCS.md](./architecture/DOCS.md)
- `embedded/`：[EMBEDDED.md](./architecture/EMBEDDED.md)
- `frame/`：[FRAME.md](./architecture/FRAME.md)
- `manager/`：[MANAGER.md](./architecture/MANAGER.md)
- `runtime/`：[RUNTIME.md](./architecture/RUNTIME.md)
- `space/`：[SPACE.md](./architecture/SPACE.md)
- `spec/`：[SPEC.md](./architecture/SPEC.md)
- `styles/`：[STYLES.md](./architecture/STYLES.md)

没有单独架构文档的目录：
- `bootstrap/`
- `editors/`
- `services/`
- `test/`

## 顶层目录含义

### [blocksuite/](../)

Blocksuite 集成根目录。

这里放的是三类内容：
- 通用基础件：编码、错误、调试、header、性能打点
- 领域子目录：`description/`、`space/`、`runtime/`、`frame/` 等
- 文档与测试：`doc/`、`test/`

目录划分原则：
- 根目录只放被多个子域复用、暂时不值得再细分的基础件
- 强业务语义文件放进对应领域目录
- iframe 专用实现全部收口在 `frame/`

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

### [editors/](../editors)

编辑器创建层，把上层参数转换成真正的 Blocksuite editor 实例。

### [embedded/](../embedded)

非 iframe 的嵌入式编辑器集成层。

对应子文档：[EMBEDDED.md](./architecture/EMBEDDED.md)

### [frame/](../frame)

iframe 方案专用实现。

对应子文档：[FRAME.md](./architecture/FRAME.md)

### [manager/](../manager)

Blocksuite 能力边界管理层。

对应子文档：[MANAGER.md](./architecture/MANAGER.md)

### [runtime/](../runtime)

底层运行时与同步层。

对应子文档：[RUNTIME.md](./architecture/RUNTIME.md)

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

## 根目录文件字典

- [base64.ts](../base64.ts)：`Uint8Array <-> base64` 转换工具
- [blocksuiteDocError.ts](../blocksuiteDocError.ts)：错误类型与可重试判断
- [debugFlags.ts](../debugFlags.ts)：调试开关读取
- [docExcerpt.ts](../docExcerpt.ts)：从 store 提取摘要文本
- [docHeader.ts](../docHeader.ts)：文档 header 的读写、订阅与 fallback 处理
- [mentionProfilePopover.tsx](../mentionProfilePopover.tsx)：mention 用户卡片/悬浮层 UI
- [perf.ts](../perf.ts)：Blocksuite 打开链路性能埋点

## 子目录文件索引

### [bootstrap/](../bootstrap)

- [browser.ts](../bootstrap/browser.ts)：浏览器侧 bootstrap 入口

### [description/](../description)

- [descriptionDocDb.ts](../description/descriptionDocDb.ts)：description 文档本地 updates 的 IndexedDB 读写
- [descriptionDocId.ts](../description/descriptionDocId.ts)：description/readme 文档 ID 的构造与解析
- [descriptionDocRemote.ts](../description/descriptionDocRemote.ts)：description 文档远端 snapshot / updates API 封装与缓存

### [doc/](./)

- [BOUNDARY-UPDATE.md](./BOUNDARY-UPDATE.md)：边界版改动说明
- [BUSINESS.md](./BUSINESS.md)：Blocksuite 业务需求口径
- [DIRECTORY.md](./DIRECTORY.md)：当前这份目录字典
- [INTERNAL-DATA.md](./INTERNAL-DATA.md)：内部数据模型、术语、结构说明
- [LEARNING-PATH.md](./LEARNING-PATH.md)：学习路线与代码阅读顺序
- [README.md](./README.md)：Blocksuite 文档总入口
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)：常见问题与排查入口
- [architecture/ROOT.md](./architecture/ROOT.md)：根目录共享基础件架构
- [architecture/DESCRIPTION.md](./architecture/DESCRIPTION.md)：`description/` 架构
- [architecture/DOCS.md](./architecture/DOCS.md)：`doc/` 架构
- [architecture/EMBEDDED.md](./architecture/EMBEDDED.md)：`embedded/` 架构
- [architecture/FRAME.md](./architecture/FRAME.md)：`frame/` 架构
- [architecture/MANAGER.md](./architecture/MANAGER.md)：`manager/` 架构
- [architecture/RUNTIME.md](./architecture/RUNTIME.md)：`runtime/` 架构
- [architecture/SPACE.md](./architecture/SPACE.md)：`space/` 架构
- [architecture/SPEC.md](./architecture/SPEC.md)：`spec/` 架构
- [architecture/STYLES.md](./architecture/STYLES.md)：`styles/` 架构

### [editors/](../editors)

- [createBlocksuiteEditor.browser.ts](../editors/createBlocksuiteEditor.browser.ts)：统一创建浏览器侧 Blocksuite editor

### [embedded/](../embedded)

- [createEmbeddedAffineEditor.client.ts](../embedded/createEmbeddedAffineEditor.client.ts)：非 iframe 场景的嵌入式编辑器创建与业务扩展注入
- [embedIframeNoCredentiallessElements.ts](../embedded/embedIframeNoCredentiallessElements.ts)：embed iframe 相关元素处理
- [embedIframeNoCredentiallessViewOverride.ts](../embedded/embedIframeNoCredentiallessViewOverride.ts)：embed iframe view override
- [mockServices.ts](../embedded/mockServices.ts)：editor 所需 mock service
- [roomMapEmbedOption.ts](../embedded/roomMapEmbedOption.ts)：room map embed 选项扩展
- [tcAffineEditorContainer.ts](../embedded/tcAffineEditorContainer.ts)：项目自定义 editor container 元素

### [frame/](../frame)

- [BlocksuiteDescriptionEditorRuntime.browser.tsx](../frame/BlocksuiteDescriptionEditorRuntime.browser.tsx)：iframe 内 description editor runtime orchestrator
- [BlocksuiteRouteFrameClient.tsx](../frame/BlocksuiteRouteFrameClient.tsx)：iframe route client，处理启动参数、消息桥接和高度同步
- [BlocksuiteTcHeader.tsx](../frame/BlocksuiteTcHeader.tsx)：iframe 内 tcHeader UI
- [blocksuiteEditorLifecycleHydration.ts](../frame/blocksuiteEditorLifecycleHydration.ts)：iframe 启动 hydration 决策与等待逻辑
- [useBlocksuiteDocModeProvider.ts](../frame/useBlocksuiteDocModeProvider.ts)：page / edgeless 模式 provider
- [useBlocksuiteEditorLifecycle.ts](../frame/useBlocksuiteEditorLifecycle.ts)：editor 生命周期、hydrate、header、render-ready 时序
- [useBlocksuiteViewportBehavior.ts](../frame/useBlocksuiteViewportBehavior.ts)：iframe 内 viewport / fullscreen 行为

### [manager/](../manager)

- [featureSet.ts](../manager/featureSet.ts)：支持能力集合定义
- [store.ts](../manager/store.ts)：store 侧支持能力装配
- [view.ts](../manager/view.ts)：view/spec 侧支持能力装配

### [runtime/](../runtime)

- [blocksuiteWsClient.ts](../runtime/blocksuiteWsClient.ts)：Blocksuite 文档同步用 websocket client
- [remoteDocSource.ts](../runtime/remoteDocSource.ts)：snapshot + updates + ws 合并而成的远端 doc source
- [runtimeLoader.browser.ts](../runtime/runtimeLoader.browser.ts)：浏览器侧 runtime loader
- [spaceWorkspace.ts](../runtime/spaceWorkspace.ts)：SpaceWorkspace 核心运行时，负责 doc/store/source 生命周期

### [services/](../services)

- [quickSearchService.ts](../services/quickSearchService.ts)：文档 quick search service
- [tuanChatUserService.ts](../services/tuanChatUserService.ts)：TuanChat 用户服务桥接

### [space/](../space)

- [deleteSpaceDoc.ts](../space/deleteSpaceDoc.ts)：删除 space doc 的业务流程
- [spaceDocId.ts](../space/spaceDocId.ts)：Space 内 docId 构造与解析
- [spaceDocMetaPersistence.ts](../space/spaceDocMetaPersistence.ts)：space doc meta 的本地缓存与标题同步队列
- [spaceWorkspaceRegistry.ts](../space/spaceWorkspaceRegistry.ts)：业务层访问 workspace/doc/meta 的窄接口

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
- iframe 相关：优先看 [frame/](../frame) 和 [FRAME.md](./architecture/FRAME.md)
- Space / docId / registry：优先看 [space/](../space) 和 [SPACE.md](./architecture/SPACE.md)
- 远端 snapshot / updates：优先看 [description/](../description) 与 [remoteDocSource.ts](../runtime/remoteDocSource.ts)
- editor 创建：优先看 [editors/](../editors) 与 [embedded/](../embedded)
- 文档说明：优先看 [doc/](./)

如果后续继续拆目录，更新顺序也要同步：
- 先改 [DIRECTORY.md](./DIRECTORY.md)
- 再改对应子文档
- 新文件必须进入某个明确子域，不要回退到根目录散放
