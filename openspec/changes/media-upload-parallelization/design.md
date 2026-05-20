## Context

当前媒体上传管道（`app/utils/mediaUpload.ts`）对每个文件生成多质量版本后上传到 OSS。现状：

- **图片**：`browser-image-compression` 已内置 Web Worker（`useWebWorker: true`），但 GIF 光栅化走主线程 canvas；low/medium 派生此前串行执行
- **音频/视频**：使用 `@ffmpeg/ffmpeg` WASM，全局单例模式——同一时刻只能执行一条 `ffmpeg.exec()` 命令，`Promise.all` 形同虚设
- **质量档位**：图片已废弃 high（`high: undefined`），但音频/视频仍在生成 high 档位，浪费转码时间
- **批量上传**：`avatarBatchUpload.ts` 已实现 prepare 并行 + commit 串行的两阶段策略

技术栈：React + Vite + TypeScript，浏览器环境，`@ffmpeg/ffmpeg` v0.12+，`browser-image-compression`。

## Goals / Non-Goals

**Goals:**
- 所有媒体类型的多质量版本压缩/转码实现真并行（独立 Worker/WASM 实例）
- 统一质量档位为 original/low/medium 三档，去掉 high
- GIF 光栅化脱离主线程，不阻塞 UI
- 保持向后兼容：`filesByQuality.high` 字段保留为 `undefined`，不破坏类型签名
- 错误隔离：单个质量版本转码失败不影响其他版本

**Non-Goals:**
- 不实现 FFmpeg 实例池（复用实例）——当前采用用完即销毁策略，简单可靠
- 不改变上传协议（prepare → PUT → complete 三步不变）
- 不改变批量上传的 commit 串行策略（保持列表顺序）
- 不处理 Service Worker 离线缓存场景

## Decisions

### 1. 图片并行：依赖 browser-image-compression 内置 Worker

**选择**：不额外创建 Worker，直接利用 `browser-image-compression` 的 `useWebWorker: true`。

**理由**：该库每次调用自动 spawn 独立 Worker，`Promise.all` 即可实现真并行。无需自建 Worker 管理。

**替代方案**：自建 Worker Pool → 增加维护成本，且 `browser-image-compression` 已覆盖。

### 2. GIF 光栅化：OffscreenCanvas Worker

**选择**：创建专用 Worker，使用 `OffscreenCanvas` + `convertToBlob()` 在 Worker 线程完成 GIF → WebP 转换。

**理由**：GIF 不走 `browser-image-compression`（需要取首帧），只能用 canvas。主线程 canvas 阻塞 UI，OffscreenCanvas 在 Worker 中可真并行。

**兼容性**：Chrome 69+, Firefox 105+, Safari 16.4+。不支持时 fallback 到主线程 canvas。

### 3. 音频/视频并行：Isolated FFmpeg 实例

**选择**：为每个并行转码调用创建独立 FFmpeg 实例（`createFfmpegInstance`），转码完成后 `terminate()` 销毁。

**理由**：FFmpeg WASM 单实例同一时刻只能执行一条命令。要真并行必须多实例。每个实例内部自带 Worker。

**代价**：每个实例加载 ~25-30MB WASM core。3 个并行实例 ≈ 75-90MB 额外内存。对现代浏览器可接受。

**替代方案**：
- 实例池（预热 + 复用）→ 复杂度高，WASM OOB 后实例不可复用，收益有限
- 串行执行 → 当前方案，用户等待时间长

### 4. 去掉 high 档位

**选择**：所有媒体类型统一 original/low/medium 三档。`filesByQuality.high` 保留字段但值为 `undefined`。

**理由**：
- 图片已废弃 high（注释明确说明）
- original 在文件过大时已按 high profile 压缩/转码，功能上等价
- 减少一次转码 = 少一个 FFmpeg 实例 = 节省 ~30MB 内存 + 转码时间

### 5. 错误处理：WASM OOB 重建实例

**选择**：检测到 `memory access out of bounds` 时，terminate 当前实例并创建新实例重试。isolated 模式下不影响全局单例。

**理由**：WASM OOB 是 FFmpeg WASM 已知问题，实例状态已损坏，只能重建。

## Risks / Trade-offs

- **内存峰值**：3 个并行 FFmpeg 实例 ≈ 90MB 额外内存 → 移动端低内存设备可能触发 OOM。缓解：可在低内存环境降级为串行（检测 `navigator.deviceMemory`）
- **WASM 加载时间**：多实例并行加载 core 可能竞争网络带宽 → 缓解：WASM 文件走持久缓存（`resolvePersistentFfmpegAssetBlobUrl`），第二次起从 blob URL 加载
- **OffscreenCanvas 兼容性**：Safari 16.4 以下不支持 → 缓解：运行时检测，fallback 到主线程 canvas
- **后端 high 档位兼容**：如果后端 `uploadTargets` 仍返回 high 的上传 URL → 前端不上传该 URL 对应文件，需确认后端不会因缺少 high 文件而报错

## Open Questions

- 后端 `prepare-upload` 返回的 `uploadTargets` 是否仍包含 `high`？如果包含，前端跳过不上传是否会导致 `complete` 失败？
- 是否需要为低内存设备（`navigator.deviceMemory < 4`）自动降级为串行转码？
- OffscreenCanvas Worker 是否需要支持 transform 参数（缩放/旋转），还是仅处理纯光栅化？
