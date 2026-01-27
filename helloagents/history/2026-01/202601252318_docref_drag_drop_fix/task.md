# 轻量迭代：修复文档引用拖拽投放无响应

目标：修复把文档拖拽到聊天输入框/消息列表时“无反应”（drop 不触发）的问题。

## 任务清单

- [√] 修复输入框拖拽判定：dragover 阶段改用 `isDocRefDrag(dataTransfer)`，避免读取 `getData` 失败导致未 `preventDefault`
- [√] 修复消息列表拖拽判定：同上
- [√] 质量验证：运行 `pnpm typecheck`（允许存在既有无关错误）
- [√] 同步知识库：更新 `helloagents/CHANGELOG.md` 与模块文档（如有必要）
- [√] 迁移方案包：移动至 `helloagents/history/2026-01/202601252318_docref_drag_drop_fix/` 并更新索引
