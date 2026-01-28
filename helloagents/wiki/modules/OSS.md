# 模块: OSS

## 概述

本模块记录对象存储（MinIO/OSS）在前端侧的上传策略与关键约定，包括文件命名、压缩/转码策略与常见排查方式。

## 关键入口

- 前端上传工具：`app/utils/UploadUtils.ts`
- 音频转码工具：`app/utils/audioTranscodeUtils.ts`
- OSS 上传 URL：`tuanchat.ossController.getUploadUrl`

## 规范

### 音频上传压缩/转码（前端）

**目标：** 降低音频体积并统一为“近现代”可用格式；当前选择为 **Opus（Ogg 容器）**，不兼容 Safari。

#### 适用范围

- 通过 `UploadUtils.uploadAudio(...)` 走 OSS 上传的音频文件。

#### 输出格式

- **封装/编码：** `libopus`（Ogg 容器）
- **文件后缀：** `.ogg`（Opus 编码，Ogg 容器）
- **Content-Type：** `audio/ogg`

#### 默认压缩参数（以代码为准）

位于 `transcodeAudioFileToOpusOrThrow`：

- **目标码率：** `96kbps`（`DEFAULT_BITRATE_KBPS=96`）
- **VBR：** `on`
- **compression_level：** `10`
- **application：** `audio`
- **metadata：** `-map_metadata -1`（移除元数据）

#### 时长限制

- `UploadUtils.uploadAudio` 默认 `maxDuration=30s`
- 调用方可传入更长限制；若传 `<=0` 则表示“不截断”

#### 失败策略（阻止上传）

- 前端转码失败会抛错并阻止上传（避免上传原始大文件或非统一格式）。
- 输入文件大小超过 `30MB` 会直接阻止上传（避免 wasm 内存崩溃/浏览器卡死）。

#### FFmpeg 核心加载来源与超时

音频转码依赖 `@ffmpeg/core`（wasm），首次转码会下载核心文件并进行初始化，可能较慢。

- **版本约定：** `@ffmpeg/core` 版本对齐 `@ffmpeg/ffmpeg` 内置 `CORE_VERSION`（当前为 `0.12.9`），避免 wrapper/core 不一致引入兼容性问题。
- **默认核心源（按顺序尝试）：**
  - **本地打包资源（优先）：** 通过 `@ffmpeg/core?url` 与 `@ffmpeg/core/wasm?url` 由 Vite 输出到同源静态资源（避免公共 CDN 不可达导致失败）
  - `cdn.jsdelivr.net`（`@ffmpeg/core@0.12.9/dist/umd`）
  - `unpkg.com`（`@ffmpeg/core@0.12.9/dist/umd`）
- **可配置：** 通过 `VITE_FFMPEG_CORE_BASE_URL` 指向你自己的静态资源/CDN（建议在国内网络环境配置）
- **内置超时：**
  - FFmpeg 初始化/核心下载与加载：默认 `45s`
  - FFmpeg 转码执行：默认 `120s`（上传侧会按 `maxDuration` 动态计算，上限 `240s`）

#### 调试：音频上传控制台日志（DEV）

当需要定位“音频转码/上传/发送失败”时，可在开发环境开启调试日志：

- **localStorage 开关：** `localStorage.setItem("tc:audio:upload:debug", "1")`
- **全局开关：** `window.__TC_AUDIO_UPLOAD_DEBUG = true`

### 排查：为什么看到 `.mp3` / `audio/mpeg`？

如果下载 URL 后缀仍为 `.mp3` 且响应 `Content-Type: audio/mpeg`，通常表示：

1. 该文件是历史/旧版本上传产物（未走 Opus 转码策略）。
2. 当前运行的前端分支仍为旧逻辑（未使用 `UploadUtils.uploadAudio` 的 Opus 转码版本）。
3. 后端生成 downloadUrl 时对扩展名做了重写/白名单校验（可开启 `[tc-audio-upload]` 调试查看 `fileName` 与 `downloadUrl` 是否一致）。

## 变更历史

- 2026-01-28：补充音频上传的 Opus 转码压缩策略文档，并记录“看到 mp3 的常见原因”排查说明

