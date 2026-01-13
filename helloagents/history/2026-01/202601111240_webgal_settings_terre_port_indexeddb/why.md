# 变更提案: WebGAL 端口可配置并使用 IndexedDB 存储

## 需求背景
当前 WebGAL（Terre）地址与端口依赖构建期环境变量 `VITE_TERRE_URL/VITE_TERRE_WS`，在不同机器/端口运行 Terre 时需要改环境变量或重新构建，影响使用效率。
同时，实时渲染侧的“设置”目前仅支持 TTS 音频相关配置，且使用 localStorage 存储。

## 变更内容
1. 在 WebGAL 实时预览的设置中，新增 WebGAL（Terre）端口配置项（在不启动实时渲染时也可调整）。
2. 将实时渲染相关设置（TTS API 地址、Terre 端口）改为使用 IndexedDB 持久化。
3. WebGAL 相关模块读取 Terre 地址/端口时优先使用运行时配置（来自 IndexedDB 的覆盖值），默认仍回退到环境变量。

## 影响范围
- **模块:** `app/components/chat/`、`app/webGAL/`
- **文件:**
  - `app/components/chat/shared/webgal/webGALPreview.tsx`
  - `app/components/chat/core/realtimeRenderOrchestrator.tsx`
  - `app/components/chat/stores/realtimeRenderStore.ts`
  - `app/components/chat/infra/indexedDB/`（新增 DB 封装）
  - `app/webGAL/index.ts`、`app/webGAL/realtimeRenderer.ts`、`app/webGAL/fileOperator.ts`（运行时 Terre 配置）
- **API:** 无新增后端 API
- **数据:** 新增一个本地 IndexedDB 数据库存储设置

## 核心场景

### 需求: 在设置中调整 Terre 端口
**模块:** app/components/chat
用户在 WebGAL 实时预览设置中修改端口后，下次启动实时渲染使用新的端口连接 Terre。

#### 场景: 未启动实时渲染时修改端口
- 可打开设置并保存端口
- 保存后持久化到 IndexedDB

#### 场景: 启动实时渲染前检查端口
- `pollPort` 使用已保存端口进行探测
- 连接 URL 与预览链接使用已保存端口

## 风险评估
- **风险:** 端口修改后已建立连接的会话仍使用旧连接。
- **缓解:** UI 侧提示“修改端口后需要重新开启实时渲染”；实际连接在下一次启动/重连时生效。

