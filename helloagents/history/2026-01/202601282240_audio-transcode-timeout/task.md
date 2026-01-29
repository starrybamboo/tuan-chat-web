# 任务清单: 音频 NaN 定位与转码/上传卡死兜底

目录: `helloagents/history/2026-01/202601282240_audio-transcode-timeout/`

---

## 1. NaN 定位（DEV）
- [√] 1.1 捕获 React “Received NaN for the `children` attribute” 警告并打印一次调用栈，便于定位具体渲染点

## 2. 音频转码（前端）
- [√] 2.1 FFmpeg 核心加载增加 CDN fallback（jsdelivr/unpkg），并为下载/加载增加超时
- [√] 2.2 FFmpeg 转码执行增加超时，避免 Promise 长时间不返回导致发送流程卡死

## 3. OSS 上传（前端）
- [√] 3.1 PUT 上传增加超时（AbortController），避免网络异常导致卡死
- [√] 3.2 发送时增加“音频处理中” loading toast，改善卡住时的可感知性

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/OSS.md`：补充 FFmpeg 核心来源与超时说明
- [√] 4.2 更新 `helloagents/CHANGELOG.md`

