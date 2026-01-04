# Blocksuite Description Editor

## 现状

当前项目已移除 AFFiNE 相关依赖与 integration-test 相关依赖，仅保留 BlockSuite 核心包：

- @blocksuite/global
- @blocksuite/store
- @blocksuite/sync
- @blocksuite/std

因此，“描述编辑器”不再提供 AFFiNE 级别的完整块能力（段落/列表/代码/图片/表格/白板/嵌入文档等）。

原因：在当前依赖集合中，BlockSuite core 提供的是编辑器运行时/存储/同步能力，并不自带一整套可直接使用的 blocks/spec 预设。

## 如果需要“这些都需要”

要实现段落 + 列表 + 代码块 + 图片 + 表格 + 画布/白板等完整能力，必须二选一：

1) 引入一套 blocks/spec 预设依赖（例如 AFFiNE 的 spec）
- 优点：能力齐全、实现成本最低
- 缺点：会带来对 AFFiNE 生态的依赖（但可以尽量只用公开入口，避免深层/内部导入）

2) 自研 blocks/spec
- 优点：完全摆脱 AFFiNE 依赖
- 缺点：工作量非常大，需要长期维护（尤其是白板/嵌入文档/图片资源与渲染行为）

## 下一步建议

在确认目标前，建议先决定优先级：

- 目标 A：完全移除 AFFiNE 依赖（接受需要自研 spec）
- 目标 B：功能完整优先（允许引入 spec 依赖，但坚持“只走公开入口、不用内部实现细节、不引入 integration-test”）

# Blocksuite 空间/房间描述（离线编辑 + 后端落库）

## 目标

- 空间描述、房间描述使用 BlockSuite 编辑器（富文本）。
- 单人离线可编辑：编辑增量写入 IndexedDB。
- 最终落后端：将文档快照写入后端 `blocksuite_doc` 表（通过新接口）。

## BlockSuite 核心抽象速览（TestWorkspace / Doc / Block / Meta）

> 这一节用于统一口径：我们在讨论“空间/工作区”“文档集合”“文档”“块”“同步/落库”时，各自指的是什么；后续更细节的理解都以此为锚点逐步补充。

### 一句话关系图（从大到小）

- （业务侧）Space（TuanChat 的空间概念，spaceId 为边界）
  - （BlockSuite 侧）TestWorkspace（本项目使用的“文档集合 + 同步/存储 + meta 容器”）
    - Doc（可协作的文档实体，底层通常由 CRDT/Yjs 承载）
      - Block Tree（块树：paragraph/note/embed/database 等）
      - Specs/Extensions（块类型/默认属性/渲染编辑规则/扩展点的装配）

### 各抽象的职责边界（以本项目落地为准）

- （业务侧）Space
  - 我们的“空间/库”的边界：权限、成员、房间列表等业务实体都归属到 space。
  - 在 blocksuite 集成层面，我们以 `spaceId` 对应一个 blocksuite 的工作域（下文的 TestWorkspace）。
- TestWorkspace（来自 `@blocksuite/store/test`）
  - 本项目当前使用它作为“Doc 集合 + docSources + meta”的承载对象。
  - 负责：创建 doc、挂载 docSources（IndexedDB + 远端快照）、维护 meta（`docId -> title`）供 quick-search 使用。
  - 说明：这里的命名是 blocksuite 测试/集成包提供的实现，但它满足我们对“一个空间内一组文档”的工程化需求。
- Doc
  - 一个可协作的内容根：编辑产生增量（updates），可离线累积，在线后合并。
  - 从“内容结构”角度，Doc 不是纯字符串，而是块树 + 属性（props）构成的结构化数据。
- Block
  - 内容的最小结构单元：`type + props + children`。
  - 页面模式（page）与画布模式（edgeless/surface）通常是“不同的渲染与交互视图”，底层仍是同一套块模型。
- DocSource / Persistence（本项目用语）
  - 把 Doc 的更新流接到外部：例如 IndexedDB（本地离线）、HTTP（后端快照）。
  - “快照落库”是把当前状态编码成一次性 update（例如 `encodeStateAsUpdate`）写到后端。
- Blob / Assets
  - 图片/文件等大资源通常不直接写进块树里，而是存引用；blob 系统负责上传/下载/去重/权限。

### 在本项目里的对应关系（当前落地口径）

- 我们以 `spaceId` 为边界组织 blocksuite 的工作域：一个 space 对应一个 `TestWorkspace`。
- workspace 下包含“空间描述 + 房间描述”等 doc（docId 见下一节 `docId 规则`）。
- 离线编辑：Yjs updates 追加写入 IndexedDB；远端落库：以快照形式写入 `/blocksuite/doc`。

## docId 规则

- `space:{spaceId}:description`
- `room:{roomId}:description`

## workspace 组织方式（TestWorkspace）

- 以空间为单位：每个 `spaceId` 对应一个 `TestWorkspace`
- 空间相关富文本都挂在该 workspace 下：
  - 空间描述 docId：`space:{spaceId}:description`
  - 房间描述 docId：`room:{roomId}:description`

## Link(@) 文档引用（复用 blocksuite 原生能力）

- 编辑器内置 `Link`（快捷键 `@`）能力：
  - 在 **page 模式**通常插入行内引用（`affine-reference`）。
  - 在 **edgeless 模式**可插入画布上的引用卡片（例如 `affine:embed-linked-doc` / `affine:embed-synced-doc`）。
- 引用候选列表来自 meta（`docId -> title`）：
  - 需要提前把空间内可引用的 doc 写入 meta（例如房间列表同步写入 `docId + title`），这样 `@` 弹窗才能搜到。
  - 在 v0.22.x 的 blocksuite 里，meta 更常通过 `doc.workspace.meta` 访问（本项目 quickSearchService 也用这个入口）。

重要说明：

- blocksuite 的 `RootService.insertLinkByQuickSearch()` 依赖宿主注入 `quickSearchService`。
  - 若未注入，edgeless 底部工具栏的 `Link/@` 点击会 **无任何反应**（内部会直接 `return`，不会报错、也不会产生 network 请求）。
- 当前项目已在 `BlocksuiteDescriptionEditor` 初始化编辑器时注入一个最小可用的 quick-search（实现见 `app/components/chat/infra/blocksuite/quickSearchService.ts`）：
  - 数据源：`doc.workspace.meta`（内部仍是 `docId -> title` 的索引）
  - 支持：搜索 doc title 并插入 doc 引用卡片；粘贴 `http(s)` 链接则插入普通链接卡片
  - 暂不支持：在 quick-search 中“新建 doc”（后续若需要可扩展）

当前实现行为：

- 点击行内引用或引用卡片：若 `docId` 为 `room:{roomId}:...`，会跳转到对应房间设置；其他 docId 目前仅 best-effort 复制（后续可扩展为“打开任意 doc 页面”）。

这样做的好处是：同一空间内的富文本文档结构集中管理，后续扩展更多“空间级富文本”时无需新增 workspace 实例。

实现位置：

- workspace registry：[app/components/chat/infra/blocksuite/spaceWorkspaceRegistry.ts](app/components/chat/infra/blocksuite/spaceWorkspaceRegistry.ts)

## AFFiNE 的 edgeless 同步块（embed synced doc）结构理解

> 这一节用于帮助后续同学快速读懂 AFFiNE/BlockSuite 在画布里“同步块”是怎么组成的，以及我们在项目里如何仿照实现“折叠/打开/菜单”的头部壳。

我们在 AFFiNE 的 edgeless 画布里抓到的 DOM 结构（简化）大致是：

- `affine-embed-edgeless-synced-doc-block`：
  - **画布元素实体层**。负责绝对定位、缩放、选中态、视口状态（`data-viewport-state`）等。
  - 这是 AFFiNE 应用层的“edgeless 专用外壳”，并非 BlockSuite 的最小 synced-doc 组件名。
- `.embed-block-container`：
  - BlockSuite embed 系列 block 的通用外框（尺寸、拖拽、surface/page 适配等）。
- `.affine-embed-synced-doc-container`：
  - synced-doc block 的 **本体容器**。
  - 在 edgeless(surface) 场景通常会带 `surface` class。
- （AFFiNE 额外的 UI 壳）`.affine-embed-synced-doc-edgeless-header-wrapper`：
  - **折叠/打开/菜单** 都在这层。
  - 里面出现 `lit-react-portal` 说明：外层 block 多为 Lit 渲染，但头部这块 UI 用 React portal 插进去。
- `.affine-embed-synced-doc-editor` + `editor-host` + `affine-preview-root`：
  - 这是“同步块内部嵌了一个只读预览编辑器”的关键：
    - `affine-page-viewport` / `affine-edgeless-viewport` 由引用 doc 的 mode 决定。
    - `editor-host` 是 BlockSuite 的嵌套 editor 宿主。
    - `affine-preview-root` 是 preview spec 渲染出来的根节点（内部继续渲染 note/paragraph/link 等 block tree）。

重要结论：

- `editor-host/affine-preview-root` 这套“嵌套预览 editor”并不是 AFFiNE 独有，BlockSuite 的 `affine:embed-synced-doc` 也会这么做。
- 真正的“像 AFFiNE 的壳”，主要体现在 **edgeless 场景的头部 UI**（折叠/打开/菜单）以及对应交互。

### 本项目的实现方式（仿照 AFFiNE 的头部壳）
## 本项目实现方式（edgeless synced doc header）

我们现在采用“BlockSuite/AFFiNE 正统扩展链路”的方式（更接近 AFFiNE 的工程化思路），而不是在应用层用 `MutationObserver` 扫描 DOM：

- 注入点：使用 `EmbedSyncedDocConfigExtension({ edgelessHeader })` 提供 edgeless 场景的 header 渲染。
- 装配方式：把该 extension 追加到 `affine-editor-container` 的 `pageSpecs/edgelessSpecs`（与 blocksuite 内建 view extensions 一起组成最终 specs）。
- Header 渲染：`edgelessHeader` 返回 Lit 模板，渲染 `.tuanchat-embed-synced-doc-edgeless-header`（Fold/Open/Menu）。
- Fold 行为：通过 `std.store.updateBlock(model, ...)` 修改 `model.xywh` 的高度（折叠写入 header 高度，展开恢复原高度）。
- Title 读取/同步：从 meta 读取（`std.store.workspace.meta.getDocMeta(pageId).title`）；标题更新由我们在编辑器壳层对 `doc.workspace.meta` 的写入驱动。

相较 MutationObserver，这种方式不依赖“全局扫 DOM”，而是走 blocksuite 对外提供的 config extension 注入点，升级适配成本更低。
- Open 行为：
  - 复用现有逻辑：若 pageId 为 `room:{roomId}:...` 则跳转房间设置页；否则 best-effort 复制 pageId。
- 菜单行为：
  - 最小实现：提供“复制 docId”。

## 后端存储

- 使用新接口：
  - `GET /blocksuite/doc?entityType&entityId&docType`
  - `PUT /blocksuite/doc`
- snapshot 存储为 v1 JSON：`{ "v": 1, "updateB64": "...", "updatedAt": 123 }`

### 旧数据兼容

- 若新表无数据，会尝试读取旧的 `space/room extra`（key：`blocksuite_doc:description`）并写回新表一次，用于无感迁移。

## 前端实现

- 组件：`BlocksuiteDescriptionEditor`
- 本地：IndexedDB `blocksuiteDescriptionDB` 追加存储 `Yjs update`
- 远端：debounce 1.5s 将 `encodeStateAsUpdate` 的快照写入 `/blocksuite/doc`

## 最近变更

- blocksuite 升级到 `@blocksuite/affine@0.22.x` 生态后，edgeless synced-doc header 的实现从“spec patch + 生命周期 slot”迁移为 `EmbedSyncedDocConfigExtension`（更接近 AFFiNE 的实现方式）。

- 修复 edgeless `Link/@` 无响应：为 blocksuite RootService 注入 `quickSearchService`（最小实现）。
- edgeless 便签默认淡蓝底色改为“数据层”处理（更优雅、无全局 CSS 覆盖）：
  - 初始化空文档时创建的 `affine:note` 直接使用白底
  - 通过 `editPropsStore` 记录默认 note 背景，使后续新建 note 默认白底
  - 对已有使用 blocksuite 默认蓝底（`--affine-note-background-blue`）的 note 做一次性归一化
- edgeless 模式标题编辑采用方案 B：标题 UI 放在应用顶层壳（全屏左上/顶部），而不是塞进 `edgeless-editor` 内部（与官方 `AffineEditorContainer` 行为一致：`doc-title` 只在 page 模式渲染）。
- edgeless 模式引用 doc（Link/@ 选择文档）时，插入 `affine:embed-synced-doc`（style: `syncedDoc`），而不是 blocksuite 默认的 `affine:embed-linked-doc` 链接卡片，更接近 AFFiNE 官方画板体验。

## TypeScript 工程化注意事项（strict 与依赖源码）

BlockSuite v0.22.x 生态里，部分包会在 `package.json.exports` 中直接暴露 `src/*.ts` 作为类型入口。

- 这会导致 `tsc` 把依赖包的 TypeScript 源码纳入当前项目的 Program，并按我们的 `tsconfig.json`（包括 `strict`）来类型检查。
- 因为我们并不打算为上游包“修类型”，所以本项目采用 `tsconfig.json -> compilerOptions.paths` 将实际使用到的 `@blocksuite/*` 入口重定向到本地最小 stub（见 `app/types/blocksuite/*`）。
- `app/types/blocksuite-stubs.d.ts` 已废弃，仅保留为空文件用于避免旧的 ambient 声明合并。
