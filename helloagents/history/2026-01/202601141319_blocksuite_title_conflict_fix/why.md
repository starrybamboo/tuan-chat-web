# 变更提案: Blocksuite 标题冲突修复（隐藏内置标题 + 重写 tcHeader 样式）

## 需求背景
在启用 `tcHeader` 的描述文档编辑器中，我们希望“仅展示业务自定义 header”，并完全移除 Blocksuite 内置标题（`doc-title`）。

当前出现两类问题：
1. 内置标题未被完全移除时，会与 `tcHeader` 同时出现，视觉上突兀。
2. Blocksuite 在 iframe 内会注入/调整部分 CSS（以及站点侧 reset 也可能影响 iframe），导致直接照搬原生 `doc-title` 的样式在该运行环境下不稳定，需要为 `tcHeader` 重写一套更强隔离的样式。

## 变更内容
1. Ϊ `tcHeader` 模式增加兜底：当 `tcHeader.enabled=true` 时，强制隐藏 `<doc-title>`，避免与自定义 header 并存。
2. 重写 `tcHeader` 标题输入样式：使用 `all: unset` + 明确的字体/排版声明，并提供颜色/宽度变量的 fallback，抵御 Blocksuite 注入样式与 reset 的影响。

## 影响范围
- **模块:** Blocksuite 集成、描述编辑器壳层
- **文件:**
  - `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css`
  - `helloagents/wiki/modules/app.md`
  - `helloagents/wiki/vendors/blocksuite/index.md`
  - `helloagents/CHANGELOG.md`
  - `helloagents/history/index.md`
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: 标题不冲突且样式稳定
**模块:** Blocksuite 集成

#### 场景: 启用 tcHeader 的描述编辑器
- 预期结果: 页面仅显示自定义 `tcHeader`，不出现 Blocksuite 内置 `<doc-title>`
- 预期结果: tcHeader 标题样式不受 iframe 内 Blocksuite 注入 CSS / reset 影响，排版稳定

## 风险评估
- **风险:** 通过 CSS 强制隐藏 `<doc-title>` 可能掩盖上游 specs 过滤失败的原因。
- **缓解:** 保持 specs 层过滤逻辑不变，CSS 仅作为兜底防线；若后续发现上游变更导致过滤失效，再按最小代价修复识别规则。
