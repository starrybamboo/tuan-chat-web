# 轻量迭代：修复文档卡片消息在消息列表不显示

目标：文档消息已发送但消息列表中不显示内容时，补齐前端渲染兼容逻辑，确保可见。

## 任务清单

- [√] ChatBubble 渲染兼容：当 `extra.docCard` 存在但 `messageType` 不为 `DOC_CARD` 时，仍按文档卡片渲染
- [√] 质量验证：运行 `pnpm typecheck`（允许存在既有无关错误）
- [√] 同步知识库：更新 `helloagents/CHANGELOG.md` 与 `wiki/modules/chat.md`
- [ ] 迁移方案包：移动至 `helloagents/history/2026-01/202601261150_doccard_render_fix/` 并更新索引
