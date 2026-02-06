# 技术设计: sidebarTree 文档 tcHeader（标题/封面）一致化

## 技术方案

### 核心技术
- React + Zustand（本地覆盖缓存）
- Blocksuite `tc_header`（Yjs `spaceDoc` 持久化）

### 实现要点
- 文档主视图使用 `BlocksuiteDescriptionEditor` 的 `tcHeader` 模式（`disableDocTitle` + CSS 兜底隐藏 `<doc-title>`），与房间描述保持一致。
- 新增 `docHeaderOverrideStore`（localStorage 持久化）用于侧边栏即时展示 `tc_header.title/imageUrl`（不引入后端 schema 变更）。
- 侧边栏文档条目渲染时：
  - 有封面则显示缩略图，并叠加 `FileTextIcon` 作为文档标识（保持与房间条目区别）
  - 无封面则回退为 `FileTextIcon`

## 安全与性能

- **安全:** 仅缓存图片 URL 与标题到 localStorage，不落地敏感信息/令牌。
- **性能:** 侧边栏读取本地 store Ϊ O(1)，避免为每个条目打开 Blocksuite doc store。

## 测试与验证

- `pnpm typecheck`
- `pnpm lint`（允许存在既有 warning）
