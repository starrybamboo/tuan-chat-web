# 技术设计: NovelAI 自然语言生图（简单形态）

## 技术方案

### 核心技术

- 前端：`app/routes/aiImage.tsx`（React Router 路由页面）
- LLM 转换：复用现有 `tuanchat.aiWritingController.flash(...)`（后端 qwen-flash 直通接口）
- 生图：沿用现有 NovelAI 调用链路（Web 代理/直连 + Electron IPC）

### 实现要点

- 新增 `app/utils/novelaiNl2Tags.ts`：
  - 以“提示词工程”方式要求模型输出严格 JSON：`{ prompt, negativePrompt }`
  - 容错解析：支持从 Markdown code block 或混杂文本中提取 JSON
  - 生成策略：以“逗号分隔英文 tag”为主，允许 `{}`/`[]` 权重语法；对明显不当内容返回空并提示
- 在 `app/routes/aiImage.tsx` 新增 Tab：`Simple`（简单形态）
  - 输入：自然语言描述 + 可选不希望出现的内容
  - 按钮：
    - “仅转换为 tags”：生成并展示 `prompt/negativePrompt`，允许一键回填
    - “转换并出图”：生成后直接走现有生成流程并写入 history
- 对现有生成流程做轻量重构：抽取 `generateImage({ prompt, negativePrompt })`，供复杂/简单形态复用，避免 setState 竞态

## 架构决策 ADR

### ADR-001: NL→tags 转换复用后端 LLM 接口
**上下文:** 前端需要“用 AI”将自然语言转换为 NovelAI tags。仓库已存在可用的后端 LLM 调用入口（`/ai/writing/flash`），且前端已在 chat 功能中稳定使用。
**决策:** 复用 `tuanchat.aiWritingController.flash` 实现 NL→tags 转换，不新增后端接口。
**理由:** 最小变更、无需新增部署面；权限与限流沿用后端既有能力；可在未来替换为专用转换接口。
**替代方案:** 在前端直连第三方 LLM API → 拒绝原因: 密钥/合规与跨域风险更高，且需要额外配置。
**影响:** 简单形态在无后端可用时仅能退化为“手动写 tags”，但不影响复杂形态。

## API设计

不新增 API；复用：
- `POST /ai/writing/flash?result=...`

## 安全与性能

- **安全:**
  - 不在前端存储/回显任何后端密钥；只复用登录 token（既有逻辑）
  - LLM 提示词要求避免生成不当内容标签；转换结果仅作为用户可见文本，不自动上报
- **性能:**
  - 转换为一次 HTTP 调用；失败快速提示
  - 仅在用户点击时触发，不在输入时自动请求

## 测试与部署

- **测试:** 运行 `pnpm typecheck` 与 `pnpm lint`；手动在 `/ai-image` 验证简单形态转换与出图
- **部署:** 前端改动；不涉及后端与数据库

