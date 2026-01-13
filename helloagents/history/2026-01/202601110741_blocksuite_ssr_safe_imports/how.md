# how - Blocksuite SSR 安全导入修复

## 方案概述（推荐）

将“只在浏览器端才需要的 Blocksuite 运行时依赖”从 **模块顶层静态导入** 改为 **函数内动态导入**，并在入口处增加 `typeof window/document` 的环境守卫，使 SSR 评估阶段只加载 SSR-safe 的轻量代码。

### 关键点

- `deleteSpaceDoc` 作为 UI 事件触发的浏览器端能力，应避免在模块顶层导入 `spaceWorkspaceRegistry`（其依赖链会触发 `@blocksuite/*`、`lit-html`）。
- 将 `deleteSpaceDoc` 改为 `async`，在函数内部 `await import(...)`，并在 SSR 环境直接短路（不做任何 blocksuite 加载）。
- 更新调用侧（`chatRoomListPanel.tsx`）以 `await deleteSpaceDoc(...)` 的方式处理异步，并保留错误捕获日志。

## 风险与规避

- 风险：调用侧从同步变为异步，错误捕获方式需同步调整。
  - 规避：将 onClick 回调改为 `async` 并 `try/catch` 包裹 `await`。
- 风险：未来新增其他 SSR 路径再次静态导入 Blocksuite 运行时。
  - 规避：在 Blocksuite 相关 infra 层统一约定：任何可能被 SSR 评估的入口文件不得顶层导入 `@blocksuite/*` / `lit` / `lit-html`，应使用 `.client` + 动态 import。

## 验证

- 启动验证：`pnpm dev` 观察启动日志无 `document is not defined`。
- 回归验证：在 UI 中触发一次“删除文档”，确认未出现模块加载崩溃，并能按预期删除或给出错误日志。

