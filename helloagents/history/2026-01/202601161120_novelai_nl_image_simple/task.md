# 任务清单: NovelAI 自然语言生图（简单形态）

Ŀ¼: `helloagents/plan/202601161120_novelai_nl_image_simple/`

---

## 1. app: NL→tags 转换工具
- [√] 1.1 新增 `app/utils/novelaiNl2Tags.ts`：实现自然语言→`{prompt, negativePrompt}` 的 LLM 调用与容错解析，验证 why.md#需求-简单形态自然语言生图-场景-自然语言一键出图

## 2. app: 简单形态 UI 与复用生成逻辑
- [√] 2.1 在 `app/routes/aiImage.tsx` 中新增 Simple tab：自然语言输入、转换结果展示、回填按钮，验证 why.md#需求-简单形态自然语言生图-场景-转换结果回填复杂面板
- [√] 2.2 在 `app/routes/aiImage.tsx` 中抽取可复用的 `generateImage({prompt, negativePrompt})`，让复杂/简单形态共享生成与历史写入逻辑，验证 why.md#需求-简单形态自然语言生图-场景-自然语言一键出图

## 3. 安全检查
- [√] 3.1 执行安全检查（输入验证、敏感信息处理、依赖后端可用性退化策略、避免硬编码密钥/令牌）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`：补充简单形态说明与使用限制
- [√] 4.2 更新 `helloagents/CHANGELOG.md`：记录新增能力

## 5. 测试
- [√] 5.1 运行 `pnpm typecheck` 与 `pnpm lint`，确保无类型/规范错误
