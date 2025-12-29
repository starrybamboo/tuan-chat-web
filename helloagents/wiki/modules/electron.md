# electron

## 目的

提供桌面端（PC）壳与打包能力。

## 模块概述

- **职责:** Electron 主进程/壳、与前端构建产物集成、桌面端打包配置
- **状态:** ?开发中
- **最后更新:** 2025-12-27

## 规范

- Electron 相关入口与资源位于 `electron/`
- 打包配置：`electron-builder.json` 与 `package.json#build`
- 如需要打包 WebGAL/terre 相关资源，按项目 README 指引放置于 `extraResources/` 等路径（以仓库实际说明为准）

## 依赖

- `app`：前端构建产物
- `extraResources/`：可选外部资源

## 变更历史

（从 `helloagents/history/` 自动补全）

