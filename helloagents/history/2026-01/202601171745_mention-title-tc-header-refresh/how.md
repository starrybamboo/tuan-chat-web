# 技术设计: @ 标题刷新与 inline 标题同步

## 技术方案

### 实现要点

1. 在 `SpaceWorkspace` 构造函数中订阅 `meta.docMetaUpdated`：
   - 每次 meta 更新时触发 `slots.docListUpdated.next()`，让 blocksuite 的 `DocDisplayMetaProvider` 刷新标题缓存。
2. 在 `SpaceWorkspace` 的 spaces 变更同步流程中：
   - 直接从 `rootDoc.spaces` 的 subdoc 读取 `tc_header.title`（不创建 store，不解析 blocks）
   - 若读取到 title，则写入 `workspace.meta.setDocMeta(docId, { title })`

## 安全与性能

- **安全:** 仅读取 Yjs subdoc 的共享类型，不创建缺失类型，避免意外写入 doc
- **性能:** 不加载 store，避免大文档解析；仅在 title 变化时更新 meta

## 测试与验证

- `pnpm run typecheck`
- 手动验证：打开 Blocksuite 描述编辑器，输入 `@`，观察列表标题与 inline 引用标题是否为 `tc_header.title`

