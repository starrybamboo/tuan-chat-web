# 2026-01-06 BlockSuite Playground Dev 修复记录

## 背景
在主工程 dev 环境打开 `/blocksuite-playground` 时，出现多类构建/运行时问题，导致路由模块加载失败或页面白屏。

## 变更概览

### 1) 修复 `lowlight` ESM/CJS 互操作报错
- 现象：浏览器报错 `lowlight ... does not provide an export named 'default'`，触发 route module reload。
- 原因：`react-syntax-highlighter` 的 ESM 产物使用 `import lowlight from 'lowlight'`，但 `lowlight@1.x` 为 CJS 导出。
- 处理：在 Vite `optimizeDeps.noDiscovery=true` 的前提下，将 `lowlight`、`react-syntax-highlighter` 显式加入 `optimizeDeps.include`，确保其被预打包并完成 CJS→ESM interop。

### 2) 修复 BlockSuite dist 的 ES2023 auto-accessor 语法崩溃
- 现象：`SyntaxError: Unexpected identifier 'elements'`（`v-line.js`）/ `Unexpected identifier 'color'`（`brush.js`）。
- 原因：部分 `@blocksuite/*/dist` 中包含 `accessor xxx = ...`（ES2023 auto-accessor），部分运行时无法解析。
- 处理：在 Vite 增加一段仅针对 `@blocksuite/(std|affine-model)/dist/**/*.js` 的 Babel 转译规则，把 auto-accessor 语法降级为 getter/setter 实现。并确保 filter 兼容 Vite 的 `?v=` 查询参数与不同路径分隔符。

### 3) 修复 Vite 启动时 esbuild `EPIPE`
- 现象：`Error: The service was stopped: write EPIPE`，dev server 退出或无法监听端口。
- 原因：`pnpm.ignoredBuiltDependencies` 忽略了 `esbuild` 的 postinstall，导致 Vite 调用 esbuild service 不稳定。
- 处理：移除对 `esbuild` 的忽略，并执行 `pnpm install` 触发 `esbuild` postinstall。

## 涉及文件
- vite 配置：`vite.config.ts`
- 依赖配置：`package.json`

## 验证方式
1. `pnpm dev` 正常启动并监听 `http://localhost:5177/`
2. 打开 `/blocksuite-playground`，确认不再出现 `v-line.js`/`brush.js` 的 `Unexpected identifier` 报错
3. 打开含 Markdown 高亮页面，确认不再出现 `lowlight default export` 报错
