# 任务清单: 音频转码 memory OOB 兜底与重试

目录: `helloagents/history/2026-01/202601282350_audio-transcode-oob-retry/`

---

## 1. 依赖与版本
- [√] 1.1 将 `@ffmpeg/core` 版本对齐到 `@ffmpeg/ffmpeg` 的 `CORE_VERSION=0.12.9`（降低 wrapper/core 不一致风险）

## 2. 转码稳定性
- [√] 2.1 为 FFmpeg `exec` 增加 abort/超时控制，避免 worker 卡死
- [√] 2.2 捕获 `RuntimeError: memory access out of bounds` 时重置 FFmpeg worker，并用更保守参数重试一次（单声道/24kHz/更低复杂度）

## 3. 上传保护
- [√] 3.1 增加输入文件大小上限（30MB），避免超大文件导致 wasm 内存崩溃

## 4. 文档同步
- [√] 4.1 更新 `helloagents/wiki/modules/OSS.md`：补充 core 版本约定与 CDN 版本号

