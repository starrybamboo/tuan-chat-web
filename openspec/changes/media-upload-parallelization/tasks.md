## 1. 图片压缩并行化

- [ ] 1.1 将 `generateImageUploadFiles` 中 `extractImageMetadata` 与 original 压缩改为 `Promise.all` 并行
- [ ] 1.2 将 `generateImageUploadFiles` 中 low/medium 派生改为 `Promise.all` 并行
- [ ] 1.3 确认 `browser-image-compression` 的 `useWebWorker: true` 在并行调用下各自 spawn 独立 Worker

## 2. 音频 isolated FFmpeg 实例

- [ ] 2.1 在 `audioTranscodeUtils.ts` 中提取 `createFfmpegInstance` 函数（从 `getFfmpeg` 单例逻辑中抽离）
- [ ] 2.2 `AudioTranscodeOptions` 增加 `isolated?: boolean` 字段
- [ ] 2.3 `transcodeAudioFileToOpusOrThrow` 支持 isolated 模式：创建独立实例、用完 terminate
- [ ] 2.4 isolated 模式下 WASM OOB 重试逻辑：terminate 当前实例 → 新建实例 → 重试，不影响全局单例

## 3. 视频 isolated FFmpeg 实例

- [ ] 3.1 在 `videoTranscodeUtils.ts` 中提取 `createFfmpegInstance` 函数
- [ ] 3.2 `VideoTranscodeOptions` 增加 `isolated?: boolean` 字段
- [ ] 3.3 `transcodeVideoFileToWebmOrThrow` 支持 isolated 模式：创建独立实例、用完 terminate
- [ ] 3.4 isolated 模式下 WASM OOB 重试逻辑

## 4. 去掉 high 质量档位

- [ ] 4.1 `generateImageUploadFiles` 确认 `filesByQuality.high` 为 `undefined`（已有）
- [ ] 4.2 `generateAudioUploadFiles` 去掉 high 转码调用，`filesByQuality.high` 设为 `undefined`
- [ ] 4.3 `generateVideoUploadFiles` 去掉 high 转码调用，`filesByQuality.high` 设为 `undefined`
- [ ] 4.4 确认 `GeneratedMediaUploadFiles` 类型允许 `high: undefined`

## 5. mediaUpload.ts 并行编排

- [ ] 5.1 `generateAudioUploadFiles` 中 original + low + medium 使用 `Promise.all` 并行，传入 `isolated: true`
- [ ] 5.2 `generateVideoUploadFiles` 中 original + low + medium 使用 `Promise.all` 并行，传入 `isolated: true`
- [ ] 5.3 `uploadMediaFile` 中各质量版本 PUT 到 OSS 确认已是 `Promise.all`（已有）

## 6. OffscreenCanvas Worker（GIF 光栅化）

- [ ] 6.1 创建 `app/utils/imageRasterizeWorker.ts`：接收 ImageBitmap + 参数，使用 OffscreenCanvas + convertToBlob 输出 WebP
- [ ] 6.2 Worker 内实现迭代压缩逻辑：多质量候选 → 缩小尺寸 → 最多 5 轮
- [ ] 6.3 创建 `rasterizeImageInWorker` 主线程入口函数：createImageBitmap → postMessage(transfer) → 接收结果
- [ ] 6.4 运行时检测 OffscreenCanvas 支持，不支持时 fallback 到现有主线程 canvas 路径
- [ ] 6.5 更新 `rasterizeImageToWebp` 调用 Worker 版本（支持时）或 fallback 版本

## 7. 验证与兼容性

- [ ] 7.1 验证图片上传：单张非 GIF 图片，确认 low/medium 并行压缩正常
- [ ] 7.2 验证图片上传：单张 GIF 图片，确认 OffscreenCanvas Worker 路径正常（或 fallback）
- [ ] 7.3 验证音频上传：确认 3 个 isolated FFmpeg 实例并行转码，转码后正确 terminate
- [ ] 7.4 验证视频上传：确认 3 个 isolated FFmpeg 实例并行转码
- [ ] 7.5 验证批量上传：多文件 prepare 并行 + commit 串行，顺序正确
- [ ] 7.6 验证 high 档位移除：确认 `uploadTargets` 中无 high 对应文件上传，complete 接口不报错
- [ ] 7.7 验证 SHA-256 去重：重复文件上传跳过实际 PUT
- [ ] 7.8 低内存设备测试（可选）：确认 3 个 FFmpeg 实例不触发 OOM
