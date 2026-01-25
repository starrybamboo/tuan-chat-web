# 技术设计: AI 生图（角色/背景 Prompt + 双模式三栏对齐）

## 技术方案

### 核心技术
- React（现有页面 `app/routes/aiImage.tsx`）
- NovelAI v4/v4.5 参数结构：`params_version=3` + `v4_prompt` / `v4_negative_prompt`

### 实现要点
- 新增 v4 结构化 prompt 状态：
  - 背景：沿用现有 `prompt` / `negativePrompt` 作为 `base_caption`
  - 角色：新增数组状态，映射到 `char_captions`
  - `use_order` / `use_coords`：新增开关状态并写入 `v4_prompt`
- 请求映射（仅对 v4/v4.5 family 生效）：
  - `parameters.v4_prompt.caption.base_caption = prompt`
  - `parameters.v4_prompt.caption.char_captions = [{ char_caption, centers: [{x,y}] }]`
  - `parameters.v4_negative_prompt.caption.*` 同理（负面按角色对应写入）
- UI 重构：
  - 统一三栏布局：左（Prompt/参数）+ 中（预览/操作）+ 右（历史）
  - 普通模式左栏：自然语言输入 +（生成后）tags 编辑（默认隐藏负面）
  - 专业模式左栏：背景/角色分区编辑（正面/负面），并支持添加/删除/排序角色
- 历史记录：
  - `AiImageHistoryRow` 增加可选 v4 字段（不升级 IndexedDB schema）
  - 保存生成时的角色/背景结构，点击历史可回填到编辑器
- Electron 同步：
  - `electron/main.js` 的生成请求同样写入 `v4_prompt` / `v4_negative_prompt` 的 `char_captions`

## 测试与验证
- `pnpm -s typecheck`
- `pnpm -s eslint app/routes/aiImage.tsx`
- 手动：普通模式/专业模式分别生成一张图，确认三栏布局一致，历史回填后可再次生成

