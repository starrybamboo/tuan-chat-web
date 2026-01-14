# 变更提案: Blocksuite 自定义标题条（tcHeader）替代内置标题并对齐样式

## 需求背景
当前 `BlocksuiteDescriptionEditor` 已支持 `tcHeader`（存入 Yjs `tc_header`，并同步 `workspace.meta.title`），用于在描述文档中渲染“图片 + 标题”的自定义头部。

但现状存在两点体验问题：
1. 内置标题（`doc-title` / `DocTitleViewExtension`）的禁用依赖于 specs 过滤，若上游实现或引用形态变化，存在“标题未完全被移除”的潜在风险。
2. 我们的 `tcHeader` 标题输入框沿用站点通用 `input` 样式（小号+边框），与 Blocksuite 内置标题的视觉规范（大字号、居中、限定宽度）不一致。

## 变更内容
1. 强化 `disableDocTitle` 的过滤逻辑，确保在 `tcHeader.enabled=true` 时稳定移除 Blocksuite 内置标题 fragment。
2. 将 `tcHeader` 标题输入的排版/字体/间距对齐 Blocksuite 内置 `doc-title` 的视觉规范（参考 `@blocksuite/affine-fragment-doc-title` 的样式实现）。

## 影响范围
- **模块:**
  - Blocksuite 集成（`app/components/chat/infra/blocksuite`）
  - 描述编辑器壳层（`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`）
- **文件:**
  - `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts`
  - `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css`
  - `helloagents/wiki/modules/app.md`
  - `helloagents/wiki/vendors/blocksuite/index.md`
- **API:** 无
- **数据:** 无新增结构（继续复用 `tc_header`）

## 核心场景

### 需求: 描述文档标题统一
**模块:** Blocksuite 集成
在空间/房间描述编辑器中，不再展示 Blocksuite 内置标题，统一使用我们的 `tcHeader`。

#### 场景: 进入空间/房间设置页编辑描述
启用 `tcHeader` 后：
- 预期结果: 编辑器顶部仅展示“图片 + 标题”的自定义头部，不出现 Blocksuite 内置 `doc-title`
- 预期结果: 标题输入框的字号/宽度/内边距与 Blocksuite 内置标题风格一致

## 风险评估
- **风险:** header 样式调整可能影响现有布局（尤其是嵌入式窗口高度/折叠区域）。
- **缓解:** 样式仅作用于 `.tc-blocksuite-scope` 内的 `tcHeader`，并保留原有功能逻辑（图片上传、标题同步、mode switch）。
