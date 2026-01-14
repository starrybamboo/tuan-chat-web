# 任务清单（轻量迭代）: blocksuite_doc_title_double_fix

- [√] 让 `tcHeader` 模式下不再出现 `<doc-title>`：在 specs 过滤之外增加运行时兜底移除
- [√] 修复“重置内置标题”按钮：同时清空 root/page 的 title（兼容不同 doc root 结构）
- [√] 同步更新知识库与 Changelog
- [√] 质量验证：`pnpm typecheck`
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
