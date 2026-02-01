# BlockSuite 编辑器：能力清单与 Wrapper 范围（2026-01-04）

本文用于冻结当前共识：**哪些能力可以直接通过引入/组合 @blocksuite 提供的模块完成**，以及**哪些能力必须由 tuan-chat-web 自己实现（wrapper/集成层）**。

> 背景：当前项目依赖树中已包含大量 `@blocksuite/*` 包（包含 `@blocksuite/affine-block-*`、`@blocksuite/affine-gfx-*`、`@blocksuite/affine-widget-*` 等）。
> 我们优先使用这些公开包提供的 block/spec/widget/gfx 能力，而不是自行重写。

## 1. 结论（共识）

- 大多数编辑能力（段落/列表/代码/ͼƬ/表格/画布基础组件/嵌入块等）可以通过引入并注册 `@blocksuite` 现成 block/spec/widget 来实现。
- **需要我们实现的主要是“业务侧 wrapper/集成层”**：
  - `@`（提及）相关：与 TuanChat 的用户/成员体系对接（数据源、UI/选择器、序列化字段等）。
  - **画布内 embed-doc + sync doc 的外层 wrapper**：
    - doc/workspace 组织方式（room doc 挂靠 space workspace 等）
    - 远端同步/权限/路由参数与 UI 容器（SpaceSettingWindow 等）
    - 远端 snapshot API 对接（项目现有 `/blocksuite/doc` 协议）

## 2. 现有依赖（以 node_modules 现状为准）

当前 `node_modules/@blocksuite` 目录下可见（节选）：

- 基础：
  - `@blocksuite/std`、`@blocksuite/store`、`@blocksuite/sync`、`@blocksuite/global`
- 文本/常见块：
  - `@blocksuite/affine-block-paragraph`
  - `@blocksuite/affine-block-list`
  - `@blocksuite/affine-block-code`
  - `@blocksuite/affine-block-image`
  - `@blocksuite/affine-block-table`
  - `@blocksuite/affine-block-embed` / `@blocksuite/affine-block-embed-doc`
  - 以及 `bookmark/callout/divider/latex/...`
- 画布/edgeless（推测用于“画布/canvas/白板”）：
  - `@blocksuite/affine-block-surface`、`@blocksuite/affine-block-surface-ref`
  - 多个 `@blocksuite/affine-gfx-*`（brush/shape/text/connector/...）
  - 多个 `@blocksuite/affine-widget-edgeless-*`（toolbar/zoom/selected-rect/...）
- 协作/远端选择等（可能与 sync/awareness 相关）：
  - `@blocksuite/affine-widget-remote-selection`

> 注：这些包名带 `affine-` 前缀，但它们是 `@blocksuite` 发布的公开包。这里的共识是：**允许使用这些公开包**，但不直接拷贝/引用 AFFiNE 仓库源码。

## 3. 功能清单（“能直接用 blocksuite 的” vs “必须我们做 wrapper 的”）

### 3.1 直接用 @blocksuite 能覆盖的能力（预期）

- 文本编辑：段落、光标、选择、撤销重做、复制粘贴（由 std/store 及对应 block 负责）
- 列表：有序/无序/待办（由 affine-block-list 等负责）
- 代码块：插入、编辑（由 affine-block-code 等负责）
- 图片：插入/展示（由 affine-block-image 等负责）
- 表格：插入/编辑（由 affine-block-table 等负责）
- 嵌入文档块：embed-doc（由 affine-block-embed-doc 等负责）
- 画布（edgeless/surface）：基础绘制/节点/连线/文本等（由 surface + gfx + widget 组合负责）

> 以上的关键点是：**我们只需要“注册 spec/extensions + 宿主容器挂载”**，不需要重写 block 的核心实现。

### 3.2 必须由 tuan-chat-web 实现的 wrapper/集成层

1) `@` 提及（Mention）
- 数据：从 TuanChat 的 space 成员/用户体系取候选列表
- UI：输入触发、候选列表、选中后插入 token
- 存储：在 blocksuite 文档中的序列化格式（例如 inline 节点/mark）
- 权限/可见性：只允许提及本 space 可见成员等

2) 画布内 embed-doc + sync doc 外层 wrapper
- workspace/doc 组织：
  - 明确“room doc 是否挂到所属 space workspace 下”
  - docId/workspaceId 的映射规则（避免把 docId 当 workspaceId 的临时实现）
- 同步：
  - 本地 IndexedDB（已在项目中使用）
  - 远端 snapshot（项目现有 `/blocksuite/doc`，`RemoteSnapshotDocSource`）
  - 与业务的鉴权、重试、离线队列策略
- UI/路由：
  - 在 SpaceSettingWindow/RoomSetting 等位置挂载编辑器
  - embed-doc 打开/跳转时的容器、标题、面包屑、权限提示等

## 4. 实施顺序（按“先通再全”）

1) 先把“稳定可编辑”的基础链路跑通
- 目标：不白屏、不崩溃、能在 SpaceSettingWindow 编辑并持久化
- 工作：修复 Vite optimize/dedupe、host mount、doc engine 初始化等

2) 替换自研 minimal spec → blocksuite 现成 block/spec
- 目标：用 `@blocksuite/affine-block-*` 覆盖段落/列表/代码/ͼƬ/表格
- 工作：确定需要引入哪些 extension/spec，并在 std scope 里注册

3) 补齐 wrapper（必须自研部分）
- `@` mention：完成数据源 + UI + 序列化
- embed-doc wrapper：完成 doc/workspace 结构与跳转/容器
- sync wrapper：与 `/blocksuite/doc` 对齐（差异合并、快照策略、离线队列）

4) 画布 edgeless
- 目标：画布可用；嵌入 doc 在画布内可用；同步正确

## 5. 待确认点（如果口径有变化，以这里为准）

- 是否允许使用 `@blocksuite/affine-*` 公开包：当前口径为“允许”。
- 画布形态：edgeless/surface 是白板式还是节点图式？（影响 UI/交互与 wrapper 范围）
- embed-doc 的业务语义：
  - 是引用 room doc？space doc？还是任意 doc？
  - 打开方式：弹窗/右侧栏/新路由？

