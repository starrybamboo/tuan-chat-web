## Why

媒体文件（图片/音频/视频）的压缩和上传流程当前存在不必要的串行瓶颈：图片 low/medium 派生串行压缩、音频/视频共享单例 FFmpeg 实例无法并行转码、`high` 质量档位已废弃但仍占用转码时间。需要全面并行化以缩短用户等待时间，同时清理废弃的 high 档位。

## What Changes

- 图片压缩并行化：low/medium 质量派生通过 `browser-image-compression` 的 Web Worker 真并行执行；metadata 提取与 original 压缩并行
- GIF 动图前端归一化：在前端媒体模块内将 GIF 统一编码为动画 WebP，作为图片上传的标准输入格式
- 音频/视频并行转码：引入 `isolated` 模式，每次转码调用创建独立 FFmpeg WASM 实例（独立 worker），`Promise.all` 实现真并行；用完即销毁
- 所有图片格式归一化仅在前端媒体模块内完成，后端不承担图片格式转换职责
- **BREAKING** 去掉 `high` 质量档位：所有媒体类型统一为 original/low/medium 三档，`filesByQuality.high` 设为 `undefined`
- **BREAKING** 调整图片渲染层派生状态语义：客户端可在已知派生图缺失时，于首次展示请求前直接改用 `original`，并以保守写入规则维护本地派生状态缓存
- 批量上传两阶段策略：prepare 阶段（压缩 + 媒体上传）全部文件并行，commit 阶段（创建 avatar 记录）按原顺序串行
- 媒体上传管道优化：各质量版本 PUT 到 OSS 并行执行；SHA-256 去重跳过已存在文件
- 错误处理：WASM 内存越界时自动重建实例重试（isolated 模式下 terminate 后新建，singleton 模式下 reset 后重新获取）

## Capabilities

### New Capabilities
- `media-parallel-compress`: 媒体文件多质量版本并行压缩/转码——图片 Web Worker、音频/视频 isolated FFmpeg 实例
- `offscreen-canvas-worker`: GIF 光栅化 OffscreenCanvas Worker，脱离主线程的图片处理能力
- `media-quality-tiers`: 媒体质量档位策略定义——original/low/medium 三档的参数、尺寸限制、适用场景

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- `app/utils/mediaUpload.ts` — 压缩流程从串行改为 `Promise.all` 并行，去掉 high 档位
- `app/components/common/mediaImage.tsx` / `mediaPersistentImageCache.ts` — 图片展示层按 fileId 记录派生图 `available` / `missing`，已知缺失时直接展示 `original`
- `app/components/common/markdown/markDownViewer.tsx` / `app/components/chat/hooks/useChatFrameVisualEffects.ts` — Markdown 图片和房间背景图接入同一套媒体展示解析语义
- `app/utils/imgCompressUtils.ts` — 图片压缩已使用 `useWebWorker: true`，无需改动
- `app/utils/audioTranscodeUtils.ts` — 新增 `createFfmpegInstance` 函数，`AudioTranscodeOptions` 增加 `isolated` 字段，转码函数支持独立实例模式
- `app/utils/videoTranscodeUtils.ts` — 同上，视频转码支持 isolated 模式
- `app/components/Role/RoleInfoCard/avatarBatchUpload.ts` — 批量上传编排（已有两阶段策略，无需改动）
- 新增 `app/utils/offscreenCanvasWorker.ts` — OffscreenCanvas Worker 文件（待实现）
- 后端 API 兼容性：`uploadTargets` 中 `high` 档位不再有对应文件上传，需确认后端是否要求所有档位都有文件
