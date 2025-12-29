# tooling

## 目的

统一记录仓库开发脚本、质量门禁与 CI/CD 约定。

## 模块概述

- **职责:** 脚本命令、Lint/类型检查、提交流程、构建与发布说明
- **状态:** ?开发中
- **最后更新:** 2025-12-27

## 规范

### 常用命令

- `pnpm dev`：启动开发服务
- `pnpm build`：构建
- `pnpm typecheck`：类型检查
- `pnpm lint` / `pnpm lint:fix`：代码规范检查与自动修复

### VS Code/IDE 约定

仓库包含 `.vscode/` 设置，保存时以 ESLint 进行格式化；首次安装依赖后可能需要执行一次 `pnpm lint` 完成 ESLint 相关初始化（以仓库 README 为准）。

### 提交流程

项目已配置 `husky` 与 `lint-staged`，提交前将自动执行 ESLint 检查。

