# 任务清单: 修复 Vite 对 @ffmpeg/core exports 的解析

Ŀ¼: `helloagents/history/2026-01/202601282340_audio-core-exports-fix/`

---

## 1. 问题
- [√] 1.1 `pnpm dev` 下出现 `Missing \"./dist/umd/ffmpeg-core.js\" specifier in \"@ffmpeg/core\" package`（Vite 深层导入被 package `exports` 阻止）

## 2. 修复
- [√] 2.1 改为使用 `@ffmpeg/core` 的 exports 入口：`@ffmpeg/core?url` 与 `@ffmpeg/core/wasm?url`
- [√] 2.2 同源资源直接传入 `ffmpeg.load`（避免 blob URL dynamic import 兼容问题）

## 3. 文档
- [√] 3.1 更新 `helloagents/wiki/modules/OSS.md` 与 `helloagents/CHANGELOG.md`

