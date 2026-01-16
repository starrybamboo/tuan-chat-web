# tooling

## 目的

统一记录仓库开发脚本、质量门禁与 CI/CD 约定。

## 模块概述

- **职责:** 脚本命令、Lint/类型检查、提交流程、构建与发布说明
- **状态:** ?开发中
- **最后更新:** 2026-01-14

## 规范

### 常用命令

- `pnpm dev`：启动开发服务
- `pnpm build`：构建
- `pnpm typecheck`：类型检查
- `pnpm lint` / `pnpm lint:fix`：代码规范检查与自动修复

### 包管理器约定（强制）

- **唯一允许：pnpm**。仓库以 `pnpm-lock.yaml` 为唯一锁文件来源。
- **禁止使用：npm**（不要执行 `npm install` / `npm ci` / `npm run *`），避免生成/更新 `package-lock.json` 造成依赖漂移。

### Vite 依赖预打包（optimizeDeps）

本项目开发环境下启用了 `optimizeDeps.noDiscovery = true`，因此需要将存在 CJS/ESM 互操作问题的依赖显式加入 `optimizeDeps.include`。

- 典型现象：浏览器报错 `... does not provide an export named 'default'`
- 示例依赖：`react-fast-compare`（被 `ahooks` 的 ESM 构建以默认导入方式引用）

#### 缓存异常排查（chunk 缺失）

如终端出现类似报错：

- `The file does not exist at ".../node_modules/.vite/deps/chunk-XXXX.js" which is in the optimize deps directory`

通常意味着依赖预打包缓存不一致/损坏（或浏览器复用旧缓存导致请求到已失效的 chunk）。

- 优先方案：使用 `--force` 强制重建预打包缓存（本仓库 `pnpm dev` 默认已启用）
- 备选：`pnpm dev -- --force`
- 仍不稳定时：删除 `node_modules/.vite/` 后重启，并对 `localhost` 做一次强制刷新/清理站点缓存

### VS Code/IDE 约定

仓库包含 `.vscode/` 设置，保存时以 ESLint 进行格式化；首次安装依赖后可能需要执行一次 `pnpm lint` 完成 ESLint 相关初始化（以仓库 README 为准）。

### ESLint 规则提示

- `react-hooks/exhaustive-deps`：effect 内读取到的变量需要写入依赖数组；如只关心对象的部分字段，建议先提取为局部常量再写入 deps。
- `node/prefer-global/process`：脚本中避免使用全局 `process`，改为显式 `import process from "node:process"`。
- `regexp/no-super-linear-backtracking`：避免在同一正则中混用可互换的量词（如 `\\s+` + `.+` + `\\s*`），优先改为显式字符串解析或更具体的字符类。

### 提交流程

项目已配置 `husky` 与 `lint-staged`，提交前将自动执行 ESLint 检查。

## 变更历史

- [202601141740_lint_fix](../../history/2026-01/202601141740_lint_fix/) - 修复 lint 报错并补充 ESLint 规则提示
