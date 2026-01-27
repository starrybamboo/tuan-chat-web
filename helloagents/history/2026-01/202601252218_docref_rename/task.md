# 轻量迭代：重命名文档拖拽引用工具（docRef）

目标：将“文档拖拽引用”相关工具从 `dndDocRef` 命名调整为 `docRef`，避免语义误导；确保编译通过并同步知识库记录。

## 任务清单

- [√] 重命名工具文件：`app/components/chat/utils/dndDocRef.ts` → `app/components/chat/utils/docRef.ts`
- [√] 更新引用路径：替换各处 import 指向 `@/components/chat/utils/docRef`
- [√] 质量验证：运行 `pnpm typecheck`（允许存在既有无关错误）
- [√] 同步知识库：更新 `helloagents/CHANGELOG.md` 与模块文档
- [√] 迁移方案包：移动至 `helloagents/history/2026-01/202601252218_docref_rename/` 并更新索引
