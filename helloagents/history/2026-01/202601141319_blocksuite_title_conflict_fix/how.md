# 技术设计: Blocksuite 标题冲突修复（doc-title 兜底隐藏 + tcHeader 样式隔离）

## 技术方案

### 1) 兜底隐藏内置标题
- 在 `BlocksuiteDescriptionEditor` 的 root 上增加 `tc-blocksuite-tc-header-enabled` 标记 class。
- 在 `blocksuiteRuntime.css` 中添加作用域规则：
  - `.tc-blocksuite-scope.tc-blocksuite-tc-header-enabled doc-title { display: none !important; }`

该规则只在启用 `tcHeader` 时生效，避免影响其他 blocksuite 页面或调试入口。

### 2) 重写 tcHeader 标题样式（避免照搬被覆盖）
- 使用 `all: unset` 清空潜在的 reset/注入样式影响。
- 显式设置 `font-family / font-size / line-height / font-weight / color`，并对 blocksuite 变量提供 fallback：
  - `--affine-editor-width` fallback Ϊ `780px`
  - `--affine-text-primary-color` fallback Ϊ `#111827`
  - `--affine-placeholder-color` fallback Ϊ `#9ca3af`

## 架构决策 ADR

### ADR-001: CSS 隐藏 doc-title 作为兜底
**上下文:** specs 层过滤 `DocTitleViewExtension` 在上游变更或引用形态差异时可能漏删，导致双标题并存。
**决策:** 在 `tcHeader` 模式下，增加 `<doc-title>` 的 CSS 兜底隐藏，确保 UI 不出现双标题。
**理由:** 改动点小、风险可控、对用户体验最直观；同时保留 specs 层过滤作为主路径。
**影响:** 需要在知识库中明确这条兜底规则，避免排查时误判“为什么标题没了”。

## 测试与验证
- `pnpm typecheck`
- 人工验证：打开空间/房间设置页描述编辑器（tcHeader 开启），确认不出现内置标题且样式稳定。
