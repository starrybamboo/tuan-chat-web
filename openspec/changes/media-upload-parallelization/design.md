## Context

当前媒体上传管道（`app/utils/mediaUpload.ts`）对每个文件生成多质量版本后上传到 OSS。现状：

- **图片**：`browser-image-compression` 已内置 Web Worker（`useWebWorker: true`），GIF 也要在客户端统一编码为动画 WebP；low/medium 派生此前串行执行
- **音频/视频**：使用 `@ffmpeg/ffmpeg` WASM，全局单例模式——同一时刻只能执行一条 `ffmpeg.exec()` 命令，`Promise.all` 形同虚设
- **质量档位**：图片已废弃 high（`high: undefined`），但音频/视频仍在生成 high 档位，浪费转码时间
- **批量上传**：`avatarBatchUpload.ts` 已实现 prepare 并行 + commit 串行的两阶段策略

技术栈：React + Vite + TypeScript，浏览器环境，`@ffmpeg/ffmpeg` v0.12+，`browser-image-compression`。

## Goals / Non-Goals

**Goals:**
- 所有媒体类型的多质量版本压缩/转码实现真并行（独立 Worker/WASM 实例）
- 统一质量档位为 original/low/medium 三档，去掉 high
- GIF 动图在前端媒体模块内统一编码为动画 WebP，不再保留 GIF 上传特例
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

### 2. GIF 动图：前端媒体模块统一动画 WebP 编码

**选择**：GIF 不作为独立上传格式保留，前端媒体模块在生成 `original` 前将其统一编码为动画 WebP。

**理由**：媒体模块的最终约束是图片统一落到 WebP。GIF 只是输入格式，不应在上传链路里保留展示层或后端层特例。

**边界**：Web 和移动端都在 prepare-upload 前完成同一语义的 GIF → WebP 编码；后端只接收已经归一化后的 WebP 图片。

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
- 图片 original 已统一按 original profile 转 WebP（2560px / 3MiB），音视频 original 在文件过大时仍按 high profile 转码，功能上等价
- 减少一次转码 = 少一个 FFmpeg 实例 = 节省 ~30MB 内存 + 转码时间

### 5. 错误处理：WASM OOB 重建实例

**选择**：检测到 `memory access out of bounds` 时，terminate 当前实例并创建新实例重试。isolated 模式下不影响全局单例。

**理由**：WASM OOB 是 FFmpeg WASM 已知问题，实例状态已损坏，只能重建。

### 6. 图片展示层：按 fileId 记忆派生图状态

**选择**：Web 图片展示层为内部图片维护轻量的派生状态缓存，状态为 `available` / `missing`，未记录时视为 `unknown`。调用方仍可传入 `low` / `medium` 等派生 URL；展示层在渲染前按 fileId 解析最终展示地址：

- `available`：继续展示调用方传入的派生 URL
- `missing`：直接展示同 fileId 的 `original`
- `unknown`：保留调用方传入的派生 URL，并允许后续通过加载结果或权威元数据学习状态

**理由**：系统设计保证某张图片如果没有派生对象，之后也不会生成该派生对象。把 `missing` 持久化后，后续滚动、重新挂载、Markdown 图片和背景图都可以避开重复请求不存在的 OSS 对象。

**写入语义**：

- 只有“请求的派生对象本身被证明存在”时，才能写入 `available`。
- 只有“请求的派生对象本身被证明不存在”或上传/服务端元数据明确省略该档位时，才能写入 `missing`。
- 展示 `original` 成功不得写入 `available`，也不得清除既有 `missing`。
- 如果媒体服务对缺失派生对象采用重定向到 `original`，而客户端无法区分“派生对象直出成功”和“重定向后 original 成功”，客户端不得仅凭图片 load 事件写入 `available`。

**代价**：这是对“请求 URL 始终是首次展示 URL”的语义变更。已知 `missing` 的图片会在展示层先重写到 `original`，以减少不存在对象的重复请求。

## Risks / Trade-offs

- **内存峰值**：3 个并行 FFmpeg 实例 ≈ 90MB 额外内存 → 移动端低内存设备可能触发 OOM。缓解：可在低内存环境降级为串行（检测 `navigator.deviceMemory`）
- **WASM 加载时间**：多实例并行加载 core 可能竞争网络带宽 → 缓解：WASM 文件走持久缓存（`resolvePersistentFfmpegAssetBlobUrl`），第二次起从 blob URL 加载
- **后端 high 档位兼容**：如果后端 `uploadTargets` 仍返回 high 的上传 URL → 前端不上传该 URL 对应文件，需确认后端不会因缺少 high 文件而报错
- **派生状态误写风险**：若把“重定向到 original 后的成功加载”误记为派生图 `available`，后续会继续请求不存在的派生对象。展示层必须使用保守写入语义，无法确认派生对象直出时宁可保持 `unknown`。

## Open Questions

- 后端 `prepare-upload` 返回的 `uploadTargets` 是否仍包含 `high`？如果包含，前端跳过不上传是否会导致 `complete` 失败？
- 是否需要为低内存设备（`navigator.deviceMemory < 4`）自动降级为串行转码？
- 媒体服务是否会长期采用缺失派生对象 308 到 `original`？如果会，前端需要权威元数据或可区分重定向的探测接口来安全写入 `available`。
