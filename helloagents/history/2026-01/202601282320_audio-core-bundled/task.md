# 任务清单: 音频转码核心同源加载（避免 CDN 不可达）

目录: `helloagents/history/2026-01/202601282320_audio-core-bundled/`

---

## 1. 依赖
- [√] 1.1 增加 `@ffmpeg/core@0.12.10` 作为前端静态资源来源（由 Vite 输出同源 URL）

## 2. 音频转码核心加载
- [√] 2.1 `audioTranscodeUtils` 优先使用同源的 `@ffmpeg/core/dist/umd/*?url` 加载 `ffmpeg-core.js/.wasm`
- [√] 2.2 同时保留 `VITE_FFMPEG_CORE_BASE_URL` 与公共 CDN 作为 fallback
- [√] 2.3 增加内容签名校验（wasm magic / js HTML 识别），把“failed to import ffmpeg-core.js”转为更可读错误

## 3. 文档
- [√] 3.1 更新 `helloagents/wiki/modules/OSS.md`：补充“同源静态资源优先”说明
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

