# blocksuite（集成模块）

## 目的

统一记录本项目对 Blocksuite/AFFiNE 编辑器的集成策略、运行时隔离、数据/标题同步、以及常见坑位的“可运行事实来源”。

## 模块概述

- **职责:** Blocksuite runtime 初始化、iframe 强隔离、样式隔离、tcHeader/标题体系、doc metas 同步、提及/引用相关交互
- **状态:** ?开发中
- **最后更新:** 2026-01-17

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
- `@` 弹窗与引用卡片标题一律使用 `tc_header`（不回退原生标题，缺失时显示空标题）
- `@` 弹窗构建列表时按 docId 读取 `tc_header`（短 TTL 缓存），并回写 `workspace.meta.title`
- 若遇到历史数据导致“双标题/标题不一致”，以“重置内置标题”能力回归一致性

### 4) `@` 提及/引用的事实来源

当前 Blocksuite 版本下，输入 `@` 打开的弹窗来自 linked-doc widget 的 popover；同时 mention 在模型层是 embed 节点，插入必须遵循 embed 规则（见 gotchas）。

## 常见坑位（入口）

- `mention` 是 embed 节点、linked-doc popover、`abort()` 语义、StrictMode 多次 mount 等：`helloagents/wiki/vendors/blocksuite/gotchas.md`

## 相关文档

- Blocksuite 依赖文档索引：`helloagents/wiki/vendors/blocksuite/index.md`
- app 模块的 Blocksuite 集成事实记录：`helloagents/wiki/modules/app.md`

