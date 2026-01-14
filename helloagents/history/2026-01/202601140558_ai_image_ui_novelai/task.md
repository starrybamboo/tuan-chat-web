# 任务清单: AI 生图（/ai-image）UI 重构，对齐 NovelAI Image Generation

目录: `helloagents/plan/202601140558_ai_image_ui_novelai/`

---

## 1. UI 重构（/ai-image）
- [√] 1.1 在 `app/routes/aiImage.tsx` 中重构布局为“Prompt/Undesired + Image Settings + Output/History”结构，验证 why.md#需求-操作逻辑与样式接近-novelai-场景-文生图txt2img-生成并查看结果
- [√] 1.2 在 `app/routes/aiImage.tsx` 中对齐 NovelAI 风格控件（Steps/Guidance/Seed/Sampler/分辨率预设等）并保持现有字段，验证 why.md#需求-操作逻辑与样式接近-novelai-场景-文生图txt2img-生成并查看结果，依赖任务1.1
- [√] 1.3 调整 img2img 区域展示与交互（上传/预览/strength/noise），验证 why.md#需求-操作逻辑与样式接近-novelai-场景-图生图img2img-上传图片并生成，依赖任务1.2
- [√] 1.4 调整历史区 UI（网格卡片、查看/下载/删除/清空），验证 why.md#需求-操作逻辑与样式接近-novelai-场景-图生图img2img-上传图片并生成，依赖任务1.3

## 2. 安全检查
- [√] 2.1 确认 token 不被持久化、代理请求不泄漏敏感信息

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/app.md` 中 AI 生图页的 UI 说明
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 并补充 `helloagents/history/index.md` 记录

## 4. 测试
- [√] 4.1 运行 `pnpm typecheck`
