# 变更提案: WebGAL 实时渲染创建游戏不使用模板

## 需求背景
当前 WebGAL 实时渲染在创建 `realtime_{spaceId}` 游戏时会优先尝试 `WebGAL Black` 模板，但该模板在部分环境/版本下存在兼容问题，导致创建失败，影响实时渲染功能启用。

## 变更内容
1. 实时渲染创建游戏时不再传入 `templateDir`（不再尝试 `WebGAL Black`）。
2. 移除“模板 → 空项目 → 手动 mkdir”降级链路；创建失败则直接返回失败，由上层提示用户检查 WebGAL(Terre) 状态。

## 影响范围
- **模块:** `app/webGAL/`
- **文件:**
  - `app/webGAL/realtimeRenderer.ts`
  - `docs/WEBGAL_REALTIME_RENDER.md`
  - `helloagents/wiki/modules/app.md`
  - `helloagents/CHANGELOG.md`
- **API:** `manageGameControllerCreateGame`（调用方式变更：不再传 `templateDir`）
- **数据:** 无

## 核心场景

### 需求: 创建 realtime_{spaceId} 游戏（无模板）
**模块:** app/webGAL
开启实时渲染时，如果 `realtime_{spaceId}` 不存在则创建空游戏项目。

#### 场景: 创建成功
WebGAL(Terre) 服务可用且允许创建游戏目录。
- 创建请求不包含 `templateDir`
- 初始化流程继续创建场景/预加载资源/连接 WebSocket

#### 场景: 创建失败
WebGAL(Terre) 返回错误或不可用。
- `RealtimeRenderer.init()` 失败并返回 `false`
- 上层 UI 负责提示用户检查 WebGAL(Terre) 状态

## 风险评估
- **风险:** 去除手动 mkdir 兜底后，WebGAL(Terre) 创建接口异常时不再自动恢复。
- **缓解:** 失败快速暴露并提示用户检查 WebGAL(Terre) 状态，避免生成不完整目录结构导致后续更隐蔽的问题。

