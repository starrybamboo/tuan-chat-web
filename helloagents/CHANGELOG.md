# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- 新增 BlockSuite 学习路线文档：`app/components/chat/infra/blocksuite/doc/LEARNING-PATH.md`
- 新增 Blocksuite 依赖文档索引与包说明：`helloagents/wiki/vendors/blocksuite/`

### 修复
- BlockSuite 相关样式改为按需加载，并移除 KaTeX 的全局 `body{counter-reset}` 副作用（改为 blocksuite scope 生效）
- 为 `app/root.tsx` 的 `Layout` 增加默认 `data-theme="light"`，避免未挂载主题切换组件时 DaisyUI 主题变量缺失导致 UI 样式异常
- 统一包管理器为 pnpm：移除 `package-lock.json`，在 `package.json` 标注 `packageManager`，并在知识库中移除 npm/Docker 相关说明

### 移除
- 移除 Docker 相关文件（不再提供 Docker 构建链路）

## [1.0.0] - 2025-12-27

### 新增
- 初始化前端项目知识库（`helloagents/`）
