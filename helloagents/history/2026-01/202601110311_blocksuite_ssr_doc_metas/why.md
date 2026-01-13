# 需求说明：Blocksuite SSR 触发 `document is not defined`

## 背景

React Router dev/SSR 在服务端会评估部分路由/组件模块。若在模块顶层静态引入 BlockSuite/AFFiNE 相关包，依赖链可能在评估阶段触发 `lit-html`，从而访问 DOM 全局对象并报错：

- `document is not defined`

## 目标

- 避免服务端评估阶段加载 BlockSuite 运行时代码（包含 `lit`/`lit-html` 等 DOM 依赖）。
- 保持客户端功能不变：仍能在 Chat 页面读取当前 space 的 doc metas，用于 DOC 分类回填/标题展示。

## 成功标准

- `pnpm build` 不再出现 `document is not defined`（SSR/预渲染阶段稳定通过）。
- `pnpm typecheck` 通过。

