# 变更提案: @ 提及菜单标题使用 tc_header

## 需求背景

Blocksuite 的 `@`（Linked Doc）菜单在展示候选文档时，会使用 Blocksuite 原生的文档标题（通常来自 `affine:page` 的 `title`，以及 `workspace.meta.title` 的同步结果）。

当前项目已引入 `tc_header`（Yjs `tc_header.title`）作为业务侧的统一标题来源（例如 room/space 描述文档的头部标题已由 `tc_header` 驱动）。

因此在 `@` 菜单中继续显示原生标题，会造成“同一文档在不同位置标题不一致”的体验问题。

## 变更内容

1. `@` 菜单标题展示：优先使用 `tc_header.title`，无则回退到原生标题。
2. 标题同步策略：在 Workspace 的 meta（`workspace.meta.title`）层面做统一同步，使所有依赖 meta 的 UI（含 `@`）保持一致。

## 影响范围

- **模块:** blocksuite runtime / editor
- **文件:** `spaceWorkspace.ts`、`blocksuiteDescriptionEditor.tsx`（如需）
- **数据:** 仅影响前端本地 meta 标题展示，不变更后端数据结构

## 核心场景

### 需求: @ 菜单展示业务标题
**模块:** blocksuite

#### 场景: 输入 @ 打开文档列表

当用户在描述编辑器里输入 `@` 打开文档候选列表时：
- 列表项标题优先显示 `tc_header.title`
- 若 `tc_header.title` 为空，回退显示原生标题

## 风险评估

- **风险:** 标题同步策略变化可能影响已有 doc meta 的缓存与刷新时机
- **缓解:** 仅在安全的只读加载路径下读取 `tc_header`；同步更新 meta 时做差异判断，避免频繁写入与循环更新

