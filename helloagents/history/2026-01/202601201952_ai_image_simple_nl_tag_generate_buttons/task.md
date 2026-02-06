# 任务清单: AI 生图（普通模式）一键出图 + 按 tag 出图

Ŀ¼: `helloagents/plan/202601201952_ai_image_simple_nl_tag_generate_buttons/`

---

## 1. 普通模式交互改造
- [√] 1.1 在 `app/routes/aiImage.tsx` 中将“一键出图”按钮放到自然语言输入框右侧，点击后执行 NL→tags→出图并写回 tags，验证 why.md#需求-普通模式快速自然语言出图-场景-输入自然语言后一键出图
- [√] 1.2 在 `app/routes/aiImage.tsx` 的 tags 区增加“按 tag 出图”按钮，点击后直接按当前 tags 出图，验证 why.md#需求-普通模式按-tags-直接出图-场景-编辑-tags-后按-tag-出图
- [√] 1.3 删除普通模式底部“生成”按钮，保留专业模式不变，验证 why.md#变更内容

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9：输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/ai-image.md`：同步普通模式新入口（“一键出图/按 tag 出图”）
- [√] 3.2 更新 `helloagents/CHANGELOG.md`：记录本次交互变更

## 4. 测试
- [√] 4.1 `pnpm typecheck`
- [?] 4.2 手动回归测试：普通模式两种出图入口可用、tags 写回、画风合并生效
  > 备注: 需在浏览器/Electron 中手动验证 `/ai-image` 普通模式交互
