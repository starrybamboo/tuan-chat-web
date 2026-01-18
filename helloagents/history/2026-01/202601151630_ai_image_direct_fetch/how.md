# 技术设计: AI 生图 Web 端直连请求 NovelAI

## 技术方案

### 核心技术
- 浏览器 `fetch`（Web 直连）
- 同源代理 `/api/novelapi/*`（Web 备选）
- Electron IPC（Electron 直连，保持不变）

### 实现要点
- 增加 `RequestMode`（`direct`/`proxy`）并在 Connection 中提供切换入口：
  - `direct`：直接请求 NovelAI 上游
  - `proxy`：继续通过 `/api/novelapi/*` 转发
- 模型/设置拉取（`/user/*`）固定使用 `https://api.novelai.net` 作为 meta endpoint（避免误发到 image 域）
- 生图请求（`/ai/generate-image`）使用 Connection 中填写的 endpoint（默认 `https://image.novelai.net`）

## 安全与性能

- **安全:** token 仍仅用于请求 `Authorization: Bearer ...`；不在日志中输出
- **性能:** 直连可减少一次本地转发；但受浏览器跨域策略影响

## 测试与部署

- **测试:** `pnpm typecheck`、`pnpm lint`
- **手动验证:** `/ai-image` Connection 切换“直连/同源代理”，确认两种模式均能触发请求并给出可理解的错误提示
