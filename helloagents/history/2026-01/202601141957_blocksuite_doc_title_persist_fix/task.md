# 任务清单（轻量迭代）: blocksuite_doc_title_persist_fix

- [√] 修复 `<doc-title>` 仍可见：在 `affine-editor-container` 内注入隐藏 CSS，并安装可持久的 MutationObserver（强引用）持续移除
- [√] 修复“重置内置标题”无感：支持清空零宽字符占位，并在 iframe 内提示结果/同步移除 `<doc-title>`
- [√] 质量验证：`pnpm typecheck`
- [√] 同步更新知识库（CHANGELOG/wiki）
- [√] 迁移方案包至 history 并更新索引
