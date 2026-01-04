# Blocksuite 内部数据结构与术语对照（实现视角）

本文档用于解释 Blocksuite/Yjs/AFFiNE 在项目中的概念对应，帮助把业务模型（Space/Room/线索/文档）映射到 Blocksuite 的内部结构。

> 版本背景：本项目依赖 Blocksuite `0.22.4`。

## 1. 术语对照

### 1.1 Space 是不是 Workspace？

在 Blocksuite 里：
- **Workspace** 是“管理多个 Doc 的容器”，包含 meta、doc 列表、以及同步引擎在该容器上的组织方式。

在 tuan-chat 的业务里：
- **Space** 是“一个业务空间”，天然需要隔离文档集合、引用关系、权限边界。

因此在本项目的推荐映射是：
- **Space ≈ Workspace（强推荐）**

也就是说：每个 `spaceId` 对应一个 Blocksuite Workspace（或等价的 doc 集合容器）。

### 1.2 DocCollection 还存在吗？

你之前老 demo 的概念里可能出现过 `DocCollection`。
在当前 Blocksuite 版本与本项目代码里，我们主要使用的是 `Workspace` 接口/概念来承载“文档集合”。

可以把它理解为：
- `DocCollection`（旧叫法/旧抽象）≈ `Workspace`（当前承载 doc 集合的抽象）

在我们的实现里优先采用 Blocksuite 当前对外暴露的 `Workspace` / `Doc` / `Store` 结构。

## 2. Yjs 数据结构（为什么会有 rootDoc + subdoc）

在 Blocksuite store 体系里，常见结构是：
- 一个 **root Y.Doc** 作为容器
- `rootDoc.getMap('spaces')` 下挂多个 **subdocs**，每个 subdoc 对应一个 docId
- 每个 subdoc 里维护 `blocks` map（Block tree 数据）

好处：
- 一个 workspace 里可以有多 doc
- 同步/持久化可以围绕 rootDoc 管理

## 3. Store / Extensions / 渲染

- **Store**：某个 Doc 的数据访问与编辑入口（block tree 操作）
- **Store Extensions**：定义 block schema、数据层扩展（例如 affine 的 root/note/paragraph/surface）
- **View Extensions / Std Extensions**：定义如何渲染与交互（page/edgeless 对应的 preset）
- **BlockStdScope**：把 `store + extensions` 渲染成 DOM host（编辑器宿主）

## 4. Page vs Edgeless（实现要点）

业务要求所有文档支持两种模式：
- Page：文档流式编辑
- Edgeless：画布式编辑

在 Blocksuite/AFFiNE 体系里，这通常意味着：
- storeExtensions 需要支持 surface 等 block
- viewExtensions 需要分别具备 page/edgeless 的渲染 preset

落地时我们会把“当前模式”作为文档的一个 meta（或业务侧字段）存储，允许切换。

## 5. 引用（Reference）在数据结构里的可能形态

最低形态（Demo 可优先）：
- 引用关系由业务侧维护：Room 只存 `refDocId`
- UI 上通过跳转/打开引用文档完成“引用”

增强形态（后续）：
- 在文档内容里提供引用块（引用另一个 docId），支持嵌入渲染/预览

## 6. 本地历史版本 / 跨会话撤销（可选实现策略）

由于服务端不提供版本与撤销：
- 版本历史可以通过 IndexedDB 按 docId 存储周期性快照（例如 full update + 时间戳 + 标题）
- 跨会话撤销通常需要持久化 undo 栈/操作日志；如果实现复杂，可以先提供“版本回滚（restore version）”作为替代，并在 BUSINESS.md 标注降级。

当前 Demo 的落地文件：
- app/components/chat/infra/blocksuite/runtime/docHistoryDb.ts：IndexedDB 历史库（保存 full update）
- app/components/chat/infra/blocksuite/runtime/docHistory.ts：对外的“创建快照/从快照恢复”封装

---

## 变更记录

- 2026-01-05：初始化术语对照与数据结构说明
