# Blocksuite（@blocksuite/*）依赖文档（本项目）

> 目的：把“这个包/子路径是干什么的、我该从哪里导入、怎么定位到源码文件”变成可查阅的项目知识库内容。

---

## 1. 版本与范围

本项目在 `package.json` 中锁定以下 9 个包版本为 `0.22.4`：
- `@blocksuite/affine`
- `@blocksuite/affine-components`
- `@blocksuite/affine-model`
- `@blocksuite/affine-shared`
- `@blocksuite/global`
- `@blocksuite/integration-test`
- `@blocksuite/std`
- `@blocksuite/store`
- `@blocksuite/sync`

本系列文档聚焦“以上 9 个包本身的导入入口与能力边界”，并在需要时指出它们与本项目已使用的 `@blocksuite/affine-block-*`、`@blocksuite/affine-inline-*`、`@blocksuite/affine-widget-*` 等子包的关系。

---

## 2. 快速查阅路线（强烈推荐）

当你想“用 Blocksuite 做某个能力”时，建议按这个顺序定位：

1. **先找项目内已有用法（可运行的事实来源）**
   - 入口目录：`app/components/chat/infra/blocksuite/`
   - 关键文件：`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`

2. **再确认导入子路径属于哪个包**
   - 例如：`@blocksuite/affine/store`、`@blocksuite/affine/shared/services`、`@blocksuite/std/gfx`

3. **用 `exports` 定位到 node_modules 的源码文件**
   - 规则：查看 `node_modules/@blocksuite/<pkg>/package.json` 的 `exports`
   - 现状：本项目环境下，部分包的 `exports` 可能直接指向 `src/*.ts`

4. **需要稳定构建时，再关注 `dist/`**
   - 许多包同时提供 `dist/`（编译产物）与 `src/`（源码），本项目已存在针对 Blocksuite 的构建兼容处理文档与实践（见下方“项目内相关文档”）。

---

## 2.5 SSR / React Router 注意事项

- React Router dev/SSR 在服务端会评估部分路由/组件模块，因此禁止在 SSR 入口组件的模块顶层静态导入 Blocksuite runtime/registry（可能间接拉起 `lit`/`lit-html` 并触发 `document is not defined`）。
- 推荐做法：在 `useEffect`/事件回调等“仅客户端执行”的边界内使用 `import()` 动态加载，并在 cleanup 中解除订阅，避免竞态与泄漏。
- 本项目示例：`app/components/chat/chatPage.tsx` 订阅 doc metas 时改为动态 `import("@/components/chat/infra/blocksuite/spaceDocCollectionRegistry")`，用于规避 SSR 阶段的 DOM 全局对象访问。

---

## 2.6 标题（doc-title）快速定位

在 Blocksuite/AFFiNE 体系中，页面模式的“标题”通常由 fragment 渲染（而不是一个普通 block）。本项目若需要对齐标题样式/排查“为什么没有标题”，可按以下路径定位：

- extension：`DocTitleViewExtension`
  - 导入：`@blocksuite/affine-fragment-doc-title/view`
  - name：`affine-doc-title-fragment`
- custom element：`<doc-title>`
  - 源码：`node_modules/@blocksuite/affine-fragment-doc-title/src/doc-title.ts`
  - 关键样式：`font-size: 40px; line-height: 50px; font-weight: 700; max-width: var(--affine-editor-width); padding: 38px 0; padding-left/right: var(--affine-editor-side-padding, 24px)`
- 本项目替代策略（tcHeader 场景不渲染内置标题）：
  - 使用自定义容器 `tc-affine-editor-container`（fork 自 `@blocksuite/integration-test`），把 `<doc-title>` 变成“可选渲染”，避免 page 模式固定插入导致双标题。
    - 定义：`app/components/chat/infra/blocksuite/embedded/tcAffineEditorContainer.ts`
    - 使用：`app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts`（`disableDocTitle` → `disableDocTitle` 属性）
  - specs 层仍会过滤 `DocTitleViewExtension`，减少 fragment side-effect（例如 meta 同步）带来的歧义。
  - `tcHeader` 头部样式由运行时样式注入控制（确保 iframe 的 `blocksuiteFrame` 路由也生效）：
    - 注入入口：`app/components/chat/infra/blocksuite/styles/ensureBlocksuiteRuntimeStyles.ts`
    - 样式文件：`app/components/chat/infra/blocksuite/styles/tcHeader.css`
- 旧数据处理：如果历史文档曾经编辑过内置标题（写入 `doc.root.props.title`/`affine:page.title`），仍可能在某些入口出现“双标题/标题不一致”。`BlocksuiteDescriptionEditor` 的 `tcHeader` 区域提供“重置内置标题”按钮，可一键清空内置标题数据。

---

## 3. 包导航

- [`@blocksuite/affine`](affine.md)
- [`@blocksuite/affine-components`](affine-components.md)
- [`@blocksuite/affine-model`](affine-model.md)
- [`@blocksuite/affine-shared`](affine-shared.md)
- [`@blocksuite/global`](global.md)
- [`@blocksuite/std`](std.md)
- [`@blocksuite/store`](store.md)
- [`@blocksuite/sync`](sync.md)
- [`@blocksuite/integration-test`](integration-test.md)

---

## 3.5 集成豆知识 / 常见坑（本项目）

- [Blocksuite 集成豆知识 / 常见坑](gotchas.md)

---

## 4. 项目内相关文档（补充阅读）

以下是“本项目自己的 Blocksuite 集成文档/记录”，用于理解为什么要这样集成、以及遇到构建/运行问题时如何排查：

- `helloagents/wiki/modules/blocksuite.md`
- `app/components/chat/infra/blocksuite/doc/`
- `docs/BLOCKSUITE_EXAMPLES_STUDY_AND_ADAPTATION_2026-01-04.md`
- `docs/BLOCKSUITE_EDITOR_REQUIREMENTS_AND_WRAPPERS_2026-01-04.md`
- `docs/2026-01-07_electron_build_fixes.md`

