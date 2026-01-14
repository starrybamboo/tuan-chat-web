# 任务清单: clue_doc_planA

目录: `helloagents/history/2026-01/202601140226_clue_doc_planA/`

> 轻量迭代：按方案A将线索正文统一为 Blocksuite 文档入口，移除线索 UI 中的 description/note 编辑入口（保留后端字段不强制清空）。

---

## 1. 线索创建（PL 抽屉）
- [√] 1.1 在 `app/components/chat/room/drawers/clueListForPL.tsx` 中移除创建线索的 `description/note` 表单与校验，仅保留基础字段（name/image/folder）

## 2. 线索详情（弹窗）
- [√] 2.1 在 `app/components/chat/message/items/displayOfItemsDetail.tsx` 中将线索详情的正文编辑入口切换为 `BlocksuiteClueDescriptionEditor`
- [√] 2.2 在 `app/components/chat/message/items/displayOfItemsDetail.tsx` 中停止通过更新接口写入 `note`（保留兼容字段，不强制清空）

## 3. 知识库更新
- [√] 3.1 更新 `helloagents/wiki/modules/app.md` 记录线索文档化入口
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 4. 质量验证
- [√] 4.1 运行前端 typecheck：`pnpm -s tsc -p tsconfig.typecheck.json`

