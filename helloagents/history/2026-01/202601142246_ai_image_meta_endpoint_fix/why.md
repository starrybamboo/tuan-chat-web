# 变更提案: AI 生图模型拉取端点修复

## 需求背景

`/ai-image` 在运行时拉取模型列表时，会通过 `/api/novelapi/user/*` 走同源代理请求上游。此前实现会把 `X-NovelAPI-Endpoint` 设为 `image.novelai.net`（生图域），导致 `/user/clientsettings`、`/user/data` 被错误转发到生图域并返回 502。

## 变更内容

1. 将用户元数据接口（`/user/clientsettings`、`/user/data`）固定走 `https://api.novelai.net`
2. Electron 环境 `novelai:get-clientsettings` 同步固定走 `https://api.novelai.net`

## 影响范围

- **模块:** `app`、`electron`
- **文件:**
  - `app/routes/aiImage.tsx`
- **API:** 无（仅修正内部请求路由与端点选择）
- **数据:** 无

## 核心场景

### 需求: 修复模型列表运行时拉取
**模块:** `app`

修复 `/ai-image` 在加载模型列表时将 `/user/*` 误发到 `image.novelai.net` 的问题。

#### 场景: Web 环境加载模型列表
用户在浏览器访问 `/ai-image` 并触发模型列表拉取：
- `/api/novelapi/user/clientsettings` 的 `X-NovelAPI-Endpoint` Ϊ `https://api.novelai.net`
- 不再出现 `502 Bad Gateway`（上游可用且 token 有效时）

#### 场景: Electron 环境加载模型列表
Electron 渲染进程调用 `novelai:get-clientsettings`：
- 主进程请求的 endpoint Ϊ `https://api.novelai.net`
- 可正常返回 settings 并提取模型列表（上游可用且 token 有效时）

## 风险评估

- **风险:** 未来如上游域名策略变化，固定端点可能需要调整
- **缓解:** 仅对 `/user/*` 元数据接口固定；生图仍使用用户配置的 `image` endpoint
