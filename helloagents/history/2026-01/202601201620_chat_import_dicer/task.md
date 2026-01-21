# 轻量迭代：导入文本 - 骰娘发言特殊处理

## 任务清单

- [√] 识别导入发言人为“骰娘”的行（含英文别名）
- [√] 导入映射支持选择“骰娘（系统）”
- [√] 发送时将“骰娘”行转换为 `MessageType.DICE(6)` 并填充 `extra.result`
- [√] 验证：单测 + TypeScript typecheck
- [√] 同步知识库：`wiki/modules/chat.md`、`CHANGELOG.md`、`history/index.md`

