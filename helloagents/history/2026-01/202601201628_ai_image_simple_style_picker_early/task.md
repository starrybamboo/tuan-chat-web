# 任务清单: AI 生图（普通模式）画风选择前置展示

目录: `helloagents/plan/202601201628_ai_image_simple_style_picker_early/`

---

## 1. 普通模式 UI 调整
- [√] 1.1 在 `app/routes/aiImage.tsx` 中将“画风”选择区从 `prompt.trim()` 的条件渲染中移出，确保普通模式首次进入即可展示，验证 why.md#需求-普通模式画风选择前置展示-场景-首次进入普通模式即可选择画风
- [√] 1.2 确保普通模式点击“生成”时仍会将画风 tags 合并进最终 prompt/negativePrompt，且选择状态不会因自然语言输入变化被误清空，验证 why.md#需求-普通模式画风选择前置展示-场景-首次进入普通模式即可选择画风

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9：输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/ai-image.md`：同步普通模式交互事实（画风入口前置展示）
- [√] 3.2 更新 `helloagents/CHANGELOG.md`：记录本次交互修复

## 4. 测试
- [?] 4.1 手动回归测试：首次进入普通模式可见画风；选择画风→生成；清空→生成；切换专业模式不回归
  > 备注: 已通过 `pnpm typecheck`；需在浏览器/Electron 中手动验证 `/ai-image` 普通模式交互
