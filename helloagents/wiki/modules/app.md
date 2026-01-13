# app

## 目的

承载前端 UI、路由与页面级业务逻辑。

## 模块概述

- **职责:** 页面路由、页面组件、通用组件与工具库组织
- **状态:** ?开发中
- **最后更新:** 2026-01-08

## 规范

### 目录约定

- `app/routes/`：路由页面（最终页面）
- `app/components/`：页面组件，按业务大模块分类；`common/` 放通用组件
- `app/utils/`：工具函数与通用逻辑
- `app/webGAL/`：WebGAL 相关
  - 实时渲染创建游戏：不使用模板（不传 `templateDir`），创建失败直接返回失败
  - 实时渲染设置：Terre 端口可配置（IndexedDB 持久化）

### 样式与组件

- 以 Tailwind CSS + daisyUI 为主，补充样式文件见 `app/app.css` 等

## 依赖

- `api`：后端 API/WS 调用

## 关键子模块

### Blocksuite 集成

- 集成代码：`app/components/chat/infra/blocksuite/`
- SSR/开发态模块评估：避免在 SSR 可达模块的顶层静态引入 `@blocksuite/*` / `lit*`，改为在浏览器事件/Effect 内使用 `import()` 动态加载（例如 `app/components/chat/infra/blocksuite/deleteSpaceDoc.ts`），以规避 `document is not defined`
- 相关文档：`app/components/chat/infra/blocksuite/doc/`（含 `LEARNING-PATH.md` 学习路线）
- 依赖文档：`helloagents/wiki/vendors/blocksuite/index.md`
- 嵌入式隔离（官方兼容）：在 blocksuite 初始化前调用 `startBlocksuiteStyleIsolation` + `ensureBlocksuiteRuntimeStyles`，并将 `@toeverything/theme` 的 `:root` 变量与 KaTeX 的 `body{counter-reset}` 作用域化到 `.tc-blocksuite-scope`/`.blocksuite-portal`，避免污染同页其它 UI
- iframe 强隔离（最稳）：通过 `blocksuite-frame` 路由在 iframe 内运行 Blocksuite，主窗口仅作为 iframe 宿主，并用 `postMessage` 同步 mode/theme/导航，彻底避免同页其它 UI 被全局注入污染
- 主题同步：仅同步到 `.tc-blocksuite-scope` 与 `.blocksuite-portal`（不改动 `html/body`），确保弹层与编辑器主题一致
- 上游副作用规避：通过 `pnpm.patchedDependencies` 修补 blocksuite 0.22.4 中对 `document.body.style` 的全局写入（见 `patches/@blocksuite__*.patch`）

## 变更历史

（从 `helloagents/history/` 自动补全）
