# why - Blocksuite SSR 安全导入修复

## 背景

在 `react-router dev`（Vite 模块运行器）启动阶段会以 SSR 方式评估部分模块。当前工程中存在“在 SSR 评估期静态导入 Blocksuite 运行时依赖”的路径，导致 Node 环境下触发 `document is not defined`（来自 `lit-html` / `@blocksuite/*` 依赖链）。

## 目标

- 修复开发态 SSR 评估阶段的 `document is not defined` 报错，确保 `react-router dev` 能正常启动。
- 保持浏览器端功能不变（尤其是“侧边栏删除文档”等依赖 Blocksuite Workspace 的操作）。

## 成功标准

- 启动 `pnpm dev` 不再出现 `document is not defined` 相关堆栈。
- 浏览器端点击“删除文档”仍能正常删除（或至少不再因为模块加载而崩溃，并能输出可诊断日志）。

