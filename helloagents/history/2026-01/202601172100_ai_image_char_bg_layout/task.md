# 任务清单: AI 生图（角色/背景 Prompt + 双模式三栏对齐）

目录: `helloagents/plan/202601172100_ai_image_char_bg_layout/`

---

## 1. AI 生图页面
- [√] 1.1 在 `app/routes/aiImage.tsx` 增加 v4 角色/背景编辑状态（角色列表、use_order/use_coords），验证 why.md#需求-专业模式角色背景分区-场景-多角色出图
- [√] 1.2 在 `app/routes/aiImage.tsx` 将 v4/v4.5 请求参数映射到 `v4_prompt/v4_negative_prompt` 的 `char_captions`，验证 why.md#需求-专业模式角色背景分区-场景-多角色出图
- [√] 1.3 在 `app/routes/aiImage.tsx` 将普通/专业模式 UI 统一为三栏布局并复用中间/右侧区域，验证 why.md#需求-两模式三栏对齐-场景-普通模式一键生成后继续编辑
- [√] 1.4 在 `app/routes/aiImage.tsx` 扩展历史保存与回填（兼容旧数据），验证 why.md#需求-两模式三栏对齐-场景-普通模式一键生成后继续编辑

## 2. Electron 生成请求一致性
- [√] 2.1 在 `electron/main.js` 对齐 v4/v4.5 的 `char_captions` 映射（保持与 Web 一致）

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md` 与 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 执行 `pnpm -s typecheck`
- [√] 5.2 执行 `pnpm -s eslint app/routes/aiImage.tsx`
