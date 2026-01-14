# 任务清单（轻量迭代）: blocksuite_doc_title_shadow_fix

- [√] 修复 `tcHeader` 模式新建文档仍显示 `<doc-title>`：为 editor 的 open ShadowRoot 注入隐藏样式，并递归观察后续出现的 nested ShadowRoot，兜底移除/隐藏 `<doc-title>`
- [√] 质量验证：`pnpm typecheck`
- [√] 同步知识库与 Changelog（如有新增结论）
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
