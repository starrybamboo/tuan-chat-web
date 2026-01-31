# 任务清单: disable_google_fonts

目录: `helloagents/plan/202601201340_disable_google_fonts/`

---

## 1. 页面启动阻塞修复
- [√] 1.1 在 `app/root.tsx` 中将 Google Fonts（Inter）外链改为可配置开关，默认不加载，避免网络不可达时阻塞页面渲染
- [√] 1.2 在 `.env.production` 中增加开关配置，确保生产环境默认不再请求 `fonts.googleapis.com`

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/app.md`，记录字体加载策略与开关用法
- [√] 2.2 更新 `helloagents/CHANGELOG.md`，记录本次变更

## 3. 质量验证
- [√] 3.1 运行 `pnpm typecheck`，确保类型检查通过
- [?] 3.2 本地验证：打开任意页面确认不再发起 `https://fonts.googleapis.com/css2?...` 请求
