# 技术设计: WebGAL 端口可配置并使用 IndexedDB 存储

## 技术方案

### 核心技术
- Zustand 状态管理（实时渲染设置）
- IndexedDB（持久化设置）
- WebGAL(Terre) API/WS 连接（运行时根据配置生成 URL）

### 实现要点
- 新增本地 IndexedDB KV 存储：保存 `ttsApiUrl` 与 `terrePort`。
- `realtimeRenderStore`：
  - 增加 `terrePort`、`ensureHydrated()` 等方法，确保 UI/启动逻辑读取到已持久化配置。
  - 保存设置时写入 IndexedDB，并同步到 WebGAL 运行时配置（Terre baseUrl/wsUrl 生成逻辑）。
- `app/webGAL`：
  - 引入运行时 Terre 配置模块：默认读取环境变量，允许通过设置覆盖端口。
  - API 客户端与资源 URL 生成改为按需获取当前 baseUrl（避免模块初始化时固定死端口）。
- `WebGALPreview`：
  - 设置弹窗扩展为同时支持 TTS 与 Terre 端口。
  - 未启动实时渲染时仍可打开设置进行修改。
- `RealtimeRenderOrchestrator`：
  - 启动前 `ensureHydrated()`，并使用 store 中的 `terrePort` 进行 `pollPort`。

## 安全与性能
- **安全:** 不新增敏感信息存储；仅本地端口与 URL 配置。
- **性能:** IndexedDB 读写为低频操作（仅设置与首次 hydrate）。

## 测试与部署
- **测试:** `pnpm typecheck`
- **部署:** 无

