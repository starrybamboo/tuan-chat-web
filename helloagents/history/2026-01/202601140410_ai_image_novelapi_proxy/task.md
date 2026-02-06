# 任务清单: AI 生图模块（/ai-image）接入 /api/novelapi 代理并增强能力

Ŀ¼: `helloagents/plan/202601140410_ai_image_novelapi_proxy/`

---

## 1. /api/novelapi 代理
- [√] 1.1 在 `scripts/start.mjs` 中实现 `/api/novelapi/*` 代理路由，验证 why.md#需求-web-环境可通过代理稳定出图-场景-web-端点击生成
- [√] 1.2 在 `vite.config.ts` 中为开发环境补齐 `/api/novelapi/*` 代理 middleware，验证 why.md#需求-web-环境可通过代理稳定出图-场景-web-端点击生成，依赖任务1.1

## 2. /ai-image 页面能力增强
- [√] 2.1 在 `app/routes/aiImage.tsx` 中改为 Web 走 `/api/novelapi`、Electron 走 IPC，并统一二进制解析与错误展示，验证 why.md#需求-web-环境可通过代理稳定出图-场景-web-端点击生成 与 why.md#需求-electron-环境保持可出图且解析-zipͼƬ-场景-electron-内点击生成
- [√] 2.2 在 `app/routes/aiImage.tsx` 中新增 img2img（上传图片 + strength/noise），验证 why.md#需求-支持-img2img历史保存与下载-场景-上传图片进行-img2img，依赖任务2.1
- [√] 2.3 新增本地历史存储模块（IndexedDB）并在 `app/routes/aiImage.tsx` 接入历史/下载/清理，验证 why.md#需求-支持-img2img历史保存与下载-场景-保存历史并下载，依赖任务2.2

## 3. Electron 代理与类型同步
- [√] 3.1 在 `electron/main.js` 中补齐 img2img 参数转发与 ZIP/图片格式识别兜底，验证 why.md#需求-electron-环境保持可出图且解析-zipͼƬ-场景-electron-内点击生成
- [√] 3.2 在 `app/electron.d.ts` 中同步 IPC payload 类型（img2img/strength/noise 等），依赖任务3.1

## 4. 安全检查
- [√] 4.1 执行安全检查（按G9: 输入验证、敏感信息处理、开放代理风险规避、避免明文落盘 token）

## 5. 文档更新
- [√] 5.1 更新 `helloagents/wiki/modules/app.md`（/ai-image 能力与代理说明）
- [√] 5.2 更新 `helloagents/CHANGELOG.md` 并补充 `helloagents/history/index.md` 记录

## 6. 测试
- [√] 6.1 运行 `pnpm typecheck`，并在 Web/Electron 环境做基本手动验证（出图、zip/png 解析、img2img、历史/下载）
