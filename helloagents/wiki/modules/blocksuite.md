# blocksuite（集成模块）

## 目的

统一记录本项目对 Blocksuite/AFFiNE 编辑器的集成策略、运行时隔离、数据/标题同步、以及常见坑位的“可运行事实来源”。

## 模块概述

- **职责:** Blocksuite runtime 初始化、iframe 强隔离、样式隔离、tcHeader/标题体系、doc metas 同步、提及/引用相关交互
- **状态:** ?开发中
$12026-01-19

## 入口与目录

- 集成目录：`app/components/chat/infra/blocksuite/`
- 核心业务组件：`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
- iframe 运行时路由：`/blocksuite-frame`
  - 路由文件：`app/routes/blocksuiteFrame.tsx`
  - 路由注册：`app/routes.ts`

## 关键约定（本项目）

### 1) 默认使用 iframe 强隔离

Blocksuite 运行在 `/blocksuite-frame` 内；宿主侧只负责 iframe 容器与 `postMessage` 同步（主题/高度/模式等），避免上游 portal/global style 副作用污染同页 UI。

### 2) SSR 安全：避免在模块顶层静态导入 Blocksuite runtime

React Router 的 dev/SSR 评估阶段可能会在服务端加载部分模块；Blocksuite 依赖链可能访问 DOM 全局对象。约定：在 `useEffect`/事件回调边界内使用 `import()` 动态加载，并在 cleanup 中解除订阅。

### 3) 标题体系：tcHeader vs `<doc-title>`

- 业务侧使用 `tc_header` 作为“图片+标题”头部来源，并在需要时禁用 Blocksuite 内置 `doc-title`
- 若遇到历史数据导致“双标题/标题不一致”，以“重置内置标题”能力回归一致性

### 4) `@` 提及/引用的事实来源

当前 Blocksuite 版本下，输入 `@` 打开的弹窗来自 linked-doc widget 的 popover；同时 mention 在模型层是 embed 节点，插入必须遵循 embed 规则（见 gotchas）。

补充约定（本项目 UI 信息架构）：
- `Link to Doc`（文档候选）始终优先展示
- `用户`（空间成员提及）默认收起为二级入口，仅展示“展开用户列表”，需要时再展开选择（实现位于 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 的 `getDocMenus()`）
- `用户`候选的展示信息（头像/名称）来自 `createTuanChatUserService()`：按 `userId` 拉取 `/user/info` 并缓存（避免仅显示 userId）
- mention 节点的渲染组件为 `<affine-mention />`（`@blocksuite/affine-inline-mention`）；本项目在 Blocksuite core elements 初始化前注册自定义 `<affine-mention />`，让 mention 在文档内展示头像 + 名称，并移除前缀 `@`：`app/components/chat/infra/blocksuite/spec/tcMentionElement.client.ts`
- 文档内“用户 mention”的交互：点击 mention 跳转到 `/profile/:userId`；悬浮 mention 会在短延迟后显示个人主页悬浮窗，并基于 mention 位置居中对齐（宿主侧 portal 渲染，内容为个人主页 iframe）：`app/components/chat/infra/blocksuite/spec/tcMentionElement.client.ts`、`app/components/chat/infra/blocksuite/mentionProfilePopover.tsx`、`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`

## 常见坑位（入口）

- `mention` 是 embed 节点、linked-doc popover、`abort()` 语义、StrictMode 多次 mount 等：`helloagents/wiki/vendors/blocksuite/gotchas.md`

## 相关文档

- Blocksuite 依赖文档索引：`helloagents/wiki/vendors/blocksuite/index.md`
- app 模块的 Blocksuite 集成事实记录：`helloagents/wiki/modules/app.md`

## ??

### ??: @????????
**??:** blocksuite
@????????????? tc_header ????????? Untitled?

#### ??: @??????
??? @ ?????????????
- ????: ?????????????? Untitled


### ??: @????????
**??:** blocksuite
??????? title ???????? tc_header ???

#### ??: @??????
??? @ ?????????????
- ????: ????????? tc_header ??

### ??: @????? Deleted doc
**??:** blocksuite
??????? doc ????? workspace?????? Deleted doc?

#### ??: @??????
??? @ ?????????????
- ????: ????? Deleted doc

### ??: @????? Deleted doc?workspace ???
**??:** blocksuite
????????????? `editorHost.std.workspace`???? title ????? meta?

#### ??: @??????
??? @ ?????????????
- ????: ??? Deleted doc?????????
## ????
- 202601191140_blocksuite_mention_ref_title (../../history/2026-01/202601191140_blocksuite_mention_ref_title/) - ?? @??????????
- 202601191418_blocksuite_mention_ref_title_alias (../../history/2026-01/202601191418_blocksuite_mention_ref_title_alias/) - ??????????
- 202601201346_blocksuite_mention_deleted_doc_fix (../../history/2026-01/202601201346_blocksuite_mention_deleted_doc_fix/) - ???????? Deleted doc
- 202601201354_blocksuite_mention_deleted_doc_fix2 (../../history/2026-01/202601201354_blocksuite_mention_deleted_doc_fix2/) - ???????? Deleted doc?workspace ???
