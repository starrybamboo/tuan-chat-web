# 任务清单: Blocksuite 标题冲突修复

Ŀ¼: `helloagents/plan/202601141319_blocksuite_title_conflict_fix/`

---

## 1. 功能修复（标题冲突）
- [√] 1.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 中为 tcHeader 模式增加 root 标记 class（用于 CSS 兜底隐藏 doc-title），验证 why.md#需求-标题不冲突且样式稳定-场景-启用-tcHeader-的描述编辑器
- [√] 1.2 在 `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css` 中添加 `<doc-title>` 兜底隐藏规则，并重写 `tcHeader` 标题样式（`all: unset` + 变量 fallback），验证 why.md#需求-标题不冲突且样式稳定-场景-启用-tcHeader-的描述编辑器

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9：不引入敏感信息、不新增外部依赖、不修改权限控制）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/app.md`（补充“tcHeader 模式兜底隐藏 doc-title + 样式隔离”）
- [√] 3.2 更新 `helloagents/wiki/vendors/blocksuite/index.md`（补充 doc-title 兜底隐藏定位）
- [√] 3.3 更新 `helloagents/CHANGELOG.md` 记录本次修复
- [√] 3.4 更新 `helloagents/history/index.md` 增加历史索引

## 4. 测试
- [√] 4.1 运行 `pnpm typecheck`
