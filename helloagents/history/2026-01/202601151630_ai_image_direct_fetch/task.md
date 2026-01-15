# 任务清单: AI 生图 Web 端直连请求 NovelAI

目录: `helloagents/plan/202601151630_ai_image_direct_fetch/`

---

## 1. Web 请求模式
- [√] 1.1 在 `app/routes/aiImage.tsx` 增加 Web 请求方式切换（直连/同源代理），默认直连
- [√] 1.2 模型拉取（`/user/*`）直连到 `https://api.novelai.net`，失败给出 CORS/网络提示并降级
- [√] 1.3 生图请求直连到 image endpoint（同源代理模式保留）

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/app.md`：Web 默认直连，可切换同源代理
- [√] 2.2 更新 `helloagents/CHANGELOG.md`：记录默认请求模式变更
- [√] 2.3 更新 `helloagents/history/index.md`：追加本次变更索引

## 3. 质量验证
- [√] 3.1 执行 `pnpm typecheck` / `pnpm lint`

## 4. 迁移归档
- [√] 4.1 迁移方案包到 `helloagents/history/2026-01/`
