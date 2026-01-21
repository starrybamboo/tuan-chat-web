# 轻量迭代：Blocksuite 画布全屏按钮

任务清单：
- [√] 在 Blocksuite 描述文档的画布（edgeless）增加“全屏/退出全屏”按钮
- [√] 允许 `BlocksuiteDescriptionEditor` 的 iframe 触发 Fullscreen API（`allowFullScreen` + `allow="fullscreen"`）
- [√] 自检（工程侧）：TypeScript typecheck 通过；全屏状态监听/清理完整；退出画布时 best-effort 自动退出全屏
- [√] 同步知识库：更新 `helloagents/wiki/modules/blocksuite.md` 与 `helloagents/CHANGELOG.md`
