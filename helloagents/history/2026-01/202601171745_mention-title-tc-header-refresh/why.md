# 变更提案: @ 标题刷新与 inline 标题同步

## 需求背景

当前 `@`（Linked Doc）菜单与插入后的 inline 引用标题仍显示 blocksuite 原生标题。

已实现的“meta.title 优先 tc_header.title”在部分场景下不会生效，原因是：
- blocksuite 的 `DocDisplayMetaProvider` 依赖 `workspace.slots.docListUpdated` 来刷新显示标题
- 但当前自定义 `SpaceWorkspace` 在更新 `workspace.meta`（docMetaUpdated）时，没有同步触发 `slots.docListUpdated`

因此即使 `meta.title` 已更新，UI 仍可能缓存旧标题，导致菜单/inline 都显示原生标题。

## 变更内容

1. `SpaceWorkspace`：当 `meta` 发生更新时，同步触发 `workspace.slots.docListUpdated`，让 `DocDisplayMetaProvider` 能刷新标题。
2. `SpaceWorkspace`：在不加载 store 的情况下，从 subdoc（Yjs）读取 `tc_header.title` 并写回 `meta.title`，确保菜单/inline 都优先展示业务标题。

## 影响范围

- **模块:** blocksuite runtime
- **文件:** `app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts`
- **数据:** 仅影响前端 meta 展示与刷新机制，不改动后端存储

## 核心场景

### 需求: @ 菜单与 inline 标题一致
**模块:** blocksuite

#### 场景: 打开 @ 菜单/插入 inline 引用

- `@` 菜单候选列表标题优先显示 `tc_header.title`
- 插入后的 inline 引用标题与菜单一致（同样优先 `tc_header.title`）

## 风险评估

- **风险:** 频繁触发 `docListUpdated` 造成额外刷新
- **缓解:** 仅在 meta 实际更新时触发；tc_header 同步基于差异判断

