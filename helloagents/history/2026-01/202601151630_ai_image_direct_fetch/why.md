# 变更提案: AI 生图 Web 端直连请求 NovelAI

## 需求背景

AI 生图页（`/ai-image`）此前在 Web 环境主要通过同源代理 `/api/novelapi/*` 转发到 NovelAI。当前需求希望 Web 端不再“走本地代理”，改为在浏览器侧直接请求 NovelAI 上游接口。

## 变更内容

1. Web 端默认使用“直连”方式请求 NovelAI（模型拉取走 `https://api.novelai.net`，生图走 Connection 中配置的 image endpoint）
2. 保留“同源代理”作为备选模式（用于在直连受浏览器限制时切换）
3. 更新知识库与变更记录，反映默认行为调整

## 影响范围

- **模块:** `app`、`tooling`
- **文件:**
  - `app/routes/aiImage.tsx`
  - `helloagents/wiki/modules/app.md`
  - `helloagents/CHANGELOG.md`
  - `helloagents/history/index.md`
- **API:** 无（请求路径与模式切换仅影响客户端行为）
- **数据:** 无

## 核心场景

### 需求: Web 端不走本地代理直连 NovelAI
**模块:** `app`

#### 场景: Web 端直连拉取模型
在 `/ai-image` 的 Connection 选择“直连”：
- `/user/*` 相关请求直接发往 `https://api.novelai.net`
- 若直连失败，可切换为“同源代理”模式继续调试

#### 场景: Web 端直连生图
在 `/ai-image` 的 Connection 选择“直连”并点击生成：
- `POST /ai/generate-image` 直接发往 `https://image.novelai.net`（或用户填写的 endpoint）

## 风险评估

- **风险:** 浏览器可能因跨域/CORS 或 Referer 限制导致直连失败
- **缓解:** 保留“同源代理”作为备选模式；并在 UI 文案中提示
