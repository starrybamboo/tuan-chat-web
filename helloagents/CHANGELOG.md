# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- 新增 BlockSuite 学习路线文档：`app/components/chat/infra/blocksuite/doc/LEARNING-PATH.md`
- 新增 Blocksuite 依赖文档索引与包说明：`helloagents/wiki/vendors/blocksuite/`
- WebGAL 实时预览设置支持配置 Terre 端口，并将 TTS/WebGAL 设置改为 IndexedDB 持久化

### 修复
- BlockSuite 相关样式改为按需注入，并将 `@toeverything/theme` 的 `:root` 变量与 KaTeX 的全局 `body{counter-reset}` 重写为 `.tc-blocksuite-scope`/`.blocksuite-portal` 范围内生效
- 修复 Blocksuite 嵌入页面导致同页其它 UI 样式/交互被污染：在 blocksuite 初始化前注入作用域运行时样式，并通过 pnpm patch 将 overflow/cursor 等 `document.body.style` 副作用限制到 blocksuite scope/portal
- 修复 Blocksuite 嵌入场景仍可能出现“同页其它 UI 变化/二次进入样式失效”：默认改为 iframe 强隔离（新增 `blocksuite-frame` 路由），主窗口不再执行 blocksuite runtime
- 修复 SSR 评估阶段静态导入 Blocksuite workspace 依赖链导致的 `document is not defined`：Chat 页面订阅 doc metas 改为客户端 `import()` 动态加载 registry
- 修复 Chat 侧边栏“删除文档”触发 SSR 评估阶段静态导入 blocksuite runtime 导致的 `document is not defined`：`deleteSpaceDoc` 改为浏览器端 `import()` 动态加载 workspace registry
- 修复 Blocksuite iframe 嵌入场景“文档过长被截断/画布无法全屏”：iframe 自动上报高度，宿主按需调整；画布全屏由宿主提升为 `fixed inset-0` 覆盖主窗口
- 修复 Blocksuite 在房间设置/个人主页等嵌入场景“窗口过小不便阅读”：支持 `readOnly` 且保留滚动，并在相关入口改为 `variant="full"` 提供稳定视口高度
- 修复 Blocksuite iframe 宿主容器高度被 `h-full` 覆盖导致“窗口大小不生效”：当外部已传入 `h-* / min-h-* / max-h-*` 时不再追加 `h-full`
- 修复 Blocksuite `variant=full` 在 iframe 内 page 模式无法滚动导致“看起来像窗口不生效/内容被卡住”：page 模式改为 `overflow-auto`（edgeless 仍保持 `overflow-hidden`）
- 调整 Blocksuite 在个人主页/房间设置等场景默认使用 `variant=embedded` 自动高度，以便由外层页面滚动（如需固定高度再显式传入 `variant=full`）
- 优化 Blocksuite iframe 宿主 DOM：非全屏场景直接渲染 iframe，减少额外包裹层级，避免布局/高度被多层容器干扰
- 修复 Chat 抽屉宽度在 hydration 时不一致导致的警告：`drawerPreferenceStore` 延迟从 localStorage hydrate，`OpenAbleDrawer` 首屏统一按 `lg` 渲染避免 SSR/客户端屏幕尺寸分支不一致
- 为 `app/root.tsx` 的 `Layout` 增加默认 `data-theme="light"`，避免未挂载主题切换组件时 DaisyUI 主题变量缺失导致 UI 样式异常
- 统一包管理器为 pnpm：移除 `package-lock.json`，在 `package.json` 标注 `packageManager`，并在知识库中移除 npm/Docker 相关说明
- WebGAL 实时渲染创建游戏不再使用 `WebGAL Black` 模板（不传 `templateDir`），创建失败直接返回失败

### 移除
- 移除 Docker 相关文件（不再提供 Docker 构建链路）

## [1.0.0] - 2025-12-27

### 新增
- 初始化前端项目知识库（`helloagents/`）
