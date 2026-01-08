# Blocksuite 常见问题排查（tuan-chat-web）

本文档记录在 tuan-chat-web 集成 Blocksuite/AFFiNE（`0.22.4`）时，最容易遇到的“看起来像坏掉了”的问题，以及它们在底层架构中的真实原因。

> 术语与结构建议先看：`INTERNAL-DATA.md`

---

## 1. 现象：没有标题（Title）

### 1.1 你看到的表现

- 编辑器顶部没有标题输入框
- 页面看起来只有正文块（paragraph / note）

### 1.2 根因（底层逻辑）

在 AFFiNE/Blocksuite 体系里，“标题”通常不是一个独立的普通 block（例如不是你手动 `addBlock('affine:title')` 那种）。

更常见的是：
- 标题由 **fragment / widget 的 ViewExtension** 渲染（例如 `DocTitleViewExtension`）
- 它依赖 **ViewExtensionManager 注册的 widgets/fragments**，并通过 Std 层挂到 `affine:page` 的渲染树里

如果你的 spec 只注册了少量 blocks（root/note/paragraph/surface）对应的 ViewExtension，那么标题相关 fragment 根本不会出现。

### 1.3 修复方式

- Spec 侧：使用 AFFiNE 内置的 view extensions（包含 doc title、slash menu、toolbar 等）
  - 见：`app/components/chat/infra/blocksuite/spec/affineSpec.ts`

---

## 2. 现象：空格/回车后一直显示 “Type '/' for commands”

### 2.1 你看到的表现

- 明明段落里已经有文字，placeholder 仍然显示
- 回车换行后 placeholder 也不消失

### 2.2 根因（底层逻辑）

`Type '/' for commands` 是 paragraph block 自带的 placeholder 文案。

关键点：
- placeholder 是否显示由 paragraph block 自己的 lit styles 控制：
  - `.affine-paragraph-placeholder { display: none; }`
  - `.affine-paragraph-placeholder.visible { display: block; }`
- 如果你看到 placeholder “永远显示”，更大概率是输入/渲染链路没跑起来（例如 `text` 没有正确初始化成 `Text`，导致 rich-text/selection 系统无法接管），而不是缺少外部 CSS。

### 2.2.1 本项目额外注意：不要照抄 `@blocksuite/presets/themes/affine.css`

Blocksuite 官方 examples 里经常会 `import '@blocksuite/presets/themes/affine.css'`，但我们当前依赖版本（`0.22.4`）在 `node_modules/@blocksuite/**` 下并没有提供任何 `.css` 文件，因此这条 import 在本项目里是**不可用**的。

### 2.3 修复方式

- 确保初始化/迁移时为 `affine:paragraph` 补齐 `props.text: Text`（可提供 `yText`）
- 确保 `rich-text` custom element 已注册（见 `ensureBlocksuiteCoreElementsDefined`）

---

## 3. 现象：输入 `/` 不会出现 command panel（Slash menu）

### 3.1 你看到的表现

- placeholder 提示你输入 `/`
- 但你输入 `/` 后并没有任何面板

### 3.2 根因（底层逻辑）

Slash menu 不是 paragraph block “自动就有”的功能，它属于 **widget view extension**（在 AFFiNE 里一般叫 `SlashMenuViewExtension`）。

如果 spec 没注册对应 widget：
- paragraph 仍然会展示 placeholder 文案（提示你有这个能力）
- 但真正的 slash menu 组件不会被挂载，所以输入 `/` 没反应

### 3.3 修复方式

- Spec 侧补齐 widgets：
  - 最简单：使用 AFFiNE 的 `getInternalViewExtensions()`
  - 见：`app/components/chat/infra/blocksuite/spec/affineSpec.ts`

> 注意：我们项目里不推荐走 `getInternalViewExtensions()` 这类深层导入（容易触发 `src`/`dist` 类型不一致，造成 typecheck 噪音）。当前采用的是“手动显式注册关键 widget/fragment view extensions”的方式。

---

## 4. 现象：无法切换到 Edgeless

### 4.1 你看到的表现

- 编辑器一直停留在 page
- 没有任何按钮/入口可以切换到 edgeless

### 4.2 根因（底层逻辑）

“能不能切换”分两层：

1) 数据与渲染能力是否存在
- store extensions 里要包含 `surface` 相关 blocks
- view extensions 里要包含 edgeless 的渲染 preset

2) 有没有触发切换的交互入口
- 通常由 toolbar / edgeless toolbar 等 widgets 提供 UI
- 切换动作本质上是调用 `DocModeProvider.setEditorMode('edgeless'|'page')`

如果你只实现了 `DocModeProvider`，但没有注册 toolbar 之类 widget：
- “底层能切”，但“UI 上没入口”，用户就会感知为“无法切换”

### 4.3 修复方式

- 保证 spec 中包含 toolbar/edgeless 相关 widgets（内置 view extensions 会包含）
- 我们的实现里：
  - `BlocksuiteDescriptionEditor` 通过 `DocModeExtension(docModeProvider)` 注入 provider
  - widgets 会调用 provider，React state 驱动重渲染，完成 page/edgeless 切换

---

## 5. 最小心智模型（你开始学习底层逻辑时用）

- **StoreExtensions**：决定“有哪些 block/数据结构”
- **ViewExtensions(StdExtensions)**：决定“怎么渲染、怎么交互、有哪些 widget/fragment”
- `BlockStdScope({ store, extensions }).render()`：把两者拼起来得到 `editor-host`

一个典型的“看起来坏掉”的场景，本质就是：
- 你只装了 StoreExtensions（能渲染出基础 DOM）
- 但缺 ViewExtensions（没有 widget/fragment/交互），或者缺基础 CSS（看起来像逻辑不对）
