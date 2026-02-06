# 任务清单: clue_detail_ui_refactor

Ŀ¼: `helloagents/history/2026-01/202601140302_clue_detail_ui_refactor/`

> 轻量迭代：重构“线索抽屉→线索详情弹窗”UI（单列布局、顶部固定操作区、默认更大视口），正文继续使用 BlockSuite 文档；`space_clue.note` 保留为兼容字段。

---

## 1. 弹窗尺寸与布局
- [√] 1.1 在 `app/components/chat/room/drawers/clueListForPL.tsx` 中将线索详情弹窗改为更大视口（优先全屏弹窗）

## 2. 线索详情 UI（manualData）
- [√] 2.1 在 `app/components/chat/message/items/displayOfItemsDetail.tsx` 中重构线索详情为单列布局（顶部 sticky 信息卡 + 下方文档）
- [√] 2.2 在 `app/components/chat/message/items/displayOfItemsDetail.tsx` 中将“旧笔记（兼容字段）”改为可折叠区域（默认折叠）

## 3. 知识库更新
- [√] 3.1 更新 `helloagents/wiki/modules/app.md` 记录线索详情弹窗 UI 约定
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 4. 质量验证
- [√] 4.1 运行前端 typecheck（`pnpm -s tsc -p tsconfig.typecheck.json`）

