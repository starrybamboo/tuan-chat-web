# 2026-01-07 Electron 打包/构建修复记录

## 背景
在为 Electron 打包准备生产构建时，`pnpm build` 失败，导致无法生成 `build/client`，从而无法继续执行 electron-builder。

## 问题与处理

### 1) PDF 预览 worker 缺失依赖导致构建失败
- 现象：Vite/Rollup 报错无法解析 `@toeverything/pdf-viewer`，来源于 PDF worker 模块。
- 处理：补齐依赖：
  - `@toeverything/pdf-viewer@0.1.1`
  - `@toeverything/pdfium@0.1.1`

### 2) BlockSuite/AFFiNE 相关构建兼容性
- 现象 A：部分 `@blocksuite/*/dist` 产物包含 ES2023 `accessor` 语法，Rollup 解析失败。
- 处理 A：扩展 Vite 内的 Babel 降级规则，使其覆盖 `@blocksuite/affine-block-*` 的 `dist/**/*.js`。

- 现象 B：vanilla-extract 在生产构建期间评估样式模块，触发 `document is not defined`。
- 处理 B：将 vanilla-extract 插件统一切换到 `unstable_mode: "transform"`，避免构建期执行样式模块。

- 现象 C：`@blocksuite/affine-block-note` 默认导出路径会落到 `src`（含 `*.css.ts`），容易在构建期触发问题。
- 处理 C：在 Vite alias 中强制 `@blocksuite/affine-block-note` 走 `dist` 产物。

### 3) electron-builder 配置引用不存在目录导致打包潜在失败
- 现象：`electron-builder.json` 中配置了 `extraFiles: ["./videos", "./cvideo"]`，但仓库内不存在该目录。
- 处理：移除该 `extraFiles` 配置，避免 electron-builder 因缺失路径直接失败。

### 4) 文档说明同步
- 更新 README 中关于 WebGAL_Terre 放置位置的说明：需要放到 `extraResources/` 下并包含 `WebGAL_Terre.exe`。

## 涉及文件
- 依赖：`package.json`
- 构建配置：`vite.config.ts`
- Electron builder 配置：`electron-builder.json`
- 说明文档：`README.md`

## 验证方式
1. `pnpm install`
2. `pnpm build` 可生成 `build/client` 且不再报 `@toeverything/pdf-viewer` / `document is not defined` / `accessor` 语法错误
3. 准备好 `extraResources/WebGAL_Terre.exe` 后执行 `pnpm electron:build`
