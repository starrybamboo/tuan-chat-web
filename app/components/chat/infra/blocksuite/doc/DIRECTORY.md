# Blocksuite 目录字典

本文档给 `app/components/chat/infra/blocksuite` 提供一份“目录 + 文件字典”索引。

目标只有两个：
- 精确说明每个文件夹的职责边界
- 给出每个源码文件的精确路径与一句话用途，方便检索、重构和排障

不在本文档展开的内容：
- 业务需求口径：看 `BUSINESS.md`
- 运行时链路细节：看 `frame/ARCHITECTURE.md`
- 常见故障排查：看 `TROUBLESHOOTING.md`

## 1. 顶层目录含义

### `app/components/chat/infra/blocksuite`

Blocksuite 集成根目录。

这里放的是三类东西：
- 通用基础件：编码、错误、调试、header、性能打点
- 领域子目录：`description/`、`space/`、`runtime/`、`frame/` 等
- 文档与测试：`doc/`、`test/`

目录划分原则：
- 根目录只放被多个子域复用、暂时不值得再细分的基础件
- 强业务语义的文件放进对应领域目录，不再散落在根目录
- iframe 专用实现全部收口在 `frame/`

## 2. 文件夹字典

### `app/components/chat/infra/blocksuite/bootstrap`

Blocksuite 浏览器侧初始化入口。

这里负责“把必须的浏览器补丁或注册提前做掉”，但不直接承担 editor 运行时编排。

### `app/components/chat/infra/blocksuite/description`

Description 类文档的存储与远端标识层。

边界：
- 只关心 description/readme 这类业务文档的 ID、远端快照、IndexedDB updates
- 不负责 editor UI
- 不负责 workspace 生命周期

### `app/components/chat/infra/blocksuite/doc`

纯文档目录，不放运行时代码。

这里保存的是认知材料、设计说明、学习路径和排障文档。

### `app/components/chat/infra/blocksuite/editors`

编辑器创建层。

这里把上层参数转换成真正的 Blocksuite editor 实例，但不承担 iframe 协议、route boot、宿主通信。

### `app/components/chat/infra/blocksuite/embedded`

普通嵌入式编辑器集成层。

适用范围：
- 非 iframe 的编辑器挂载
- 内嵌 editor container、自定义 embed、linked-doc、quick search、业务服务注入

### `app/components/chat/infra/blocksuite/frame`

iframe 方案专用实现。

边界：
- route frame client
- iframe runtime orchestration
- iframe postMessage 协议
- frame 内高度测量、viewport、tcHeader、启动时序

不应把非 iframe 的共享逻辑持续堆进这里。

### `app/components/chat/infra/blocksuite/manager`

Blocksuite 能力边界管理层。

这里定义项目允许启用的 Affine/Blocksuite 能力集合，并分别供 store/view 装配使用。

### `app/components/chat/infra/blocksuite/runtime`

底层运行时与同步层。

边界：
- workspace 生命周期
- doc/source 同步
- websocket fanout
- runtime loader

它是“运行时基础设施”，不是业务 UI 层。

### `app/components/chat/infra/blocksuite/services`

注入到 Blocksuite 的业务服务。

这里的文件通常会被 editor extension 或 runtime 作为 service 使用。

### `app/components/chat/infra/blocksuite/space`

Space 维度的业务映射层。

边界：
- `space:${id}` 这套 docId 规则
- space doc meta 本地持久化
- Space -> Workspace registry 窄接口
- 删除 space doc 的业务流程

### `app/components/chat/infra/blocksuite/spec`

自定义元素与扩展 spec 注册层。

这里处理的是 BlockSuite 需要注册的 schema/spec/custom element，不放业务流程代码。

### `app/components/chat/infra/blocksuite/styles`

Blocksuite 相关样式。

只放样式资源，不放逻辑。

### `app/components/chat/infra/blocksuite/test`

Blocksuite 目录内的测试收口目录。

规则：
- 新增测试优先放这里
- 除非测试必须贴着某个文件，否则不要再把 `.test.ts` 散落到各子目录

## 3. 根目录文件字典

### `app/components/chat/infra/blocksuite/base64.ts`

`Uint8Array <-> base64` 转换工具。

### `app/components/chat/infra/blocksuite/blocksuiteDocError.ts`

Blocksuite 文档相关错误类型与可重试/不可重试判断。

### `app/components/chat/infra/blocksuite/debugFlags.ts`

Blocksuite 调试开关读取。

### `app/components/chat/infra/blocksuite/docExcerpt.ts`

从 Blocksuite store 中提取摘要文本。

### `app/components/chat/infra/blocksuite/docHeader.ts`

文档 header 的读写、订阅和 fallback 处理。

### `app/components/chat/infra/blocksuite/mentionProfilePopover.tsx`

mention 对应用户卡片/悬浮层 UI。

### `app/components/chat/infra/blocksuite/perf.ts`

Blocksuite 打开链路性能埋点与 session 标记。

## 4. 子目录文件索引

### `bootstrap/`

`app/components/chat/infra/blocksuite/bootstrap/browser.ts`
- 浏览器侧 bootstrap 入口。

### `description/`

`app/components/chat/infra/blocksuite/description/descriptionDocDb.ts`
- description 文档本地 updates 的 IndexedDB 读写。

`app/components/chat/infra/blocksuite/description/descriptionDocId.ts`
- description/readme 文档 ID 的构造与解析。

`app/components/chat/infra/blocksuite/description/descriptionDocRemote.ts`
- description 文档远端 snapshot / updates API 封装与缓存。

### `doc/`

`app/components/chat/infra/blocksuite/doc/BOUNDARY-UPDATE.md`
- 当前边界版改动说明。

`app/components/chat/infra/blocksuite/doc/BUSINESS.md`
- Blocksuite 业务需求口径。

`app/components/chat/infra/blocksuite/doc/DIRECTORY.md`
- 当前这份目录字典。

`app/components/chat/infra/blocksuite/doc/INTERNAL-DATA.md`
- 内部数据模型、术语、结构说明。

`app/components/chat/infra/blocksuite/doc/LEARNING-PATH.md`
- 学习路线与代码阅读顺序。

`app/components/chat/infra/blocksuite/doc/README.md`
- Blocksuite 文档总入口。

`app/components/chat/infra/blocksuite/doc/TROUBLESHOOTING.md`
- 常见问题与排查入口。

### `editors/`

`app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.browser.ts`
- 统一创建浏览器侧 Blocksuite editor。

### `embedded/`

`app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts`
- 非 iframe 场景的嵌入式编辑器创建与业务扩展注入。

`app/components/chat/infra/blocksuite/embedded/embedIframeNoCredentiallessElements.ts`
- embed iframe 相关元素处理。

`app/components/chat/infra/blocksuite/embedded/embedIframeNoCredentiallessViewOverride.ts`
- embed iframe view override。

`app/components/chat/infra/blocksuite/embedded/mockServices.ts`
- editor 所需 mock service。

`app/components/chat/infra/blocksuite/embedded/roomMapEmbedOption.ts`
- room map embed 选项扩展。

`app/components/chat/infra/blocksuite/embedded/tcAffineEditorContainer.ts`
- 项目自定义 editor container 元素。

### `frame/`

`app/components/chat/infra/blocksuite/frame/ARCHITECTURE.md`
- iframe 方案架构文档。

`app/components/chat/infra/blocksuite/frame/BlocksuiteDescriptionEditorRuntime.browser.tsx`
- iframe 内 description editor runtime orchestrator。

`app/components/chat/infra/blocksuite/frame/BlocksuiteRouteFrameClient.tsx`
- iframe route client，处理启动参数、消息桥接和高度同步。

`app/components/chat/infra/blocksuite/frame/BlocksuiteTcHeader.tsx`
- iframe 内 tcHeader UI。

`app/components/chat/infra/blocksuite/frame/blocksuiteEditorLifecycleHydration.ts`
- iframe 启动 hydration 决策与等待逻辑。

`app/components/chat/infra/blocksuite/frame/useBlocksuiteDocModeProvider.ts`
- page / edgeless 模式 provider。

`app/components/chat/infra/blocksuite/frame/useBlocksuiteEditorLifecycle.ts`
- editor 生命周期、hydrate、header、render-ready 时序。

`app/components/chat/infra/blocksuite/frame/useBlocksuiteViewportBehavior.ts`
- iframe 内 viewport / fullscreen 行为。

### `manager/`

`app/components/chat/infra/blocksuite/manager/featureSet.ts`
- 支持能力集合定义。

`app/components/chat/infra/blocksuite/manager/store.ts`
- store 侧支持能力装配。

`app/components/chat/infra/blocksuite/manager/view.ts`
- view/spec 侧支持能力装配。

### `runtime/`

`app/components/chat/infra/blocksuite/runtime/blocksuiteWsClient.ts`
- Blocksuite 文档同步用 websocket client。

`app/components/chat/infra/blocksuite/runtime/remoteDocSource.ts`
- snapshot + updates + ws 合并而成的远端 doc source。

`app/components/chat/infra/blocksuite/runtime/runtimeLoader.browser.ts`
- 浏览器侧 runtime loader。

`app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts`
- SpaceWorkspace 核心运行时，负责 doc/store/source 生命周期。

### `services/`

`app/components/chat/infra/blocksuite/services/quickSearchService.ts`
- 文档 quick search service。

`app/components/chat/infra/blocksuite/services/tuanChatUserService.ts`
- TuanChat 用户服务桥接。

### `space/`

`app/components/chat/infra/blocksuite/space/deleteSpaceDoc.ts`
- 删除 space doc 的业务流程。

`app/components/chat/infra/blocksuite/space/spaceDocId.ts`
- Space 内 docId 构造与解析。

`app/components/chat/infra/blocksuite/space/spaceDocMetaPersistence.ts`
- space doc meta 的本地缓存与标题同步队列。

`app/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry.ts`
- 业务层访问 workspace/doc/meta 的窄接口。

### `spec/`

`app/components/chat/infra/blocksuite/spec/coreElements.browser.ts`
- 核心元素/spec 注册。

`app/components/chat/infra/blocksuite/spec/roomMapEmbedConfig.ts`
- room map embed spec 配置。

`app/components/chat/infra/blocksuite/spec/tcMentionElement.client.ts`
- tc mention 自定义元素。

### `styles/`

`app/components/chat/infra/blocksuite/styles/affine-embed-synced-doc-header.css`
- embed synced doc header 样式。

`app/components/chat/infra/blocksuite/styles/frameBase.css`
- iframe 基础样式。

`app/components/chat/infra/blocksuite/styles/tcHeader.css`
- tcHeader 样式。

### `test/`

`app/components/chat/infra/blocksuite/test/blocksuiteEditorLifecycleHydration.test.ts`
- iframe 启动 hydration 决策单测。

## 5. 如何使用这份字典

如果你要找：
- iframe 相关：优先看 `frame/`
- Space / docId / registry：优先看 `space/`
- 远端 snapshot / updates：优先看 `description/` 与 `runtime/remoteDocSource.ts`
- editor 创建：优先看 `editors/` 与 `embedded/`
- 文档说明：优先看 `doc/`

如果后续继续拆目录，更新规则也应该同步：
- 先改这里，再改其他说明文档
- 新文件必须进入某个明确子域，不要回退到根目录散放
