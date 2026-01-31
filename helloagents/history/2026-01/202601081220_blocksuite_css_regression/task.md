# 轻量迭代任务清单：BlockSuite 引入后的 CSS 回归修复

- [√] 将 BlockSuite 的 `@toeverything/theme` 与 `katex` 样式从 “调试 style” 中解耦，避免业务页静态引入 调试 样式。
- [√] 新增运行时样式入口（仅在 BlockSuite 组件挂载时加载）。
- [√] 处理 KaTeX 的 `body{counter-reset:...}` 全局副作用：移除全局 reset 并改为仅对 BlockSuite scope 生效。
- [√] 为 BlockSuite 容器增加统一 scope class，便于后续继续隔离/修复。
- [√] 更新知识库与 Changelog，并将方案包迁移至 `helloagents/history/`。
