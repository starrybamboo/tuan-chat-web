# 轻量迭代：sidebarTree 文档标题/封面缓存首屏展示

目标：sidebarTree 获取后优先展示文档节点的“标题缓存 + 封面缓存”，避免等待 docMetas/网络加载导致文档列表出现延迟或空白。

## 任务清单

- [√] 扩展 sidebarTree 数据结构：doc 节点增加 `fallbackImageUrl` 缓存字段
- [√] 扩展 doc metas：支持 `imageUrl` 并从 sidebarTree/本地缓存合并
- [√] normalize 策略优化：当 docMetas 仍未加载（为空）时保留 doc 节点并用缓存展示；meta 加载后再按 meta 过滤
- [√] 渲染与拖拽：列表展示与拖拽 payload 优先使用缓存封面
- [√] 质量验证：`pnpm typecheck`（允许存在既有无关错误）
- [√] 知识库同步：更新 `helloagents/wiki/modules/chat.md` 与 `helloagents/CHANGELOG.md`
- [√] 迁移方案包：移动至 `helloagents/history/2026-01/202601261703_sidebar_tree_doc_cache/` 并更新索引
