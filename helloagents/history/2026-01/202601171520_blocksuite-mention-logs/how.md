# 技术设计: Blocksuite @ 提及日志补强

## 技术方案
### 核心技术
- Blocksuite 描述编辑器加载链路
- mentionPicker 插入路径与菜单回调

### 实现要点
- 在 BlocksuiteDescriptionEditorRuntime 初始化时记录日志，确认编辑器运行路径。
- 在菜单 request/action 与 insertMentionAtCurrentSelection 里增加上下文日志。
- 全部日志仅在 DEV 输出，避免生产噪声。

## 安全与性能
- 安全: 日志不记录敏感信息，仅记录状态与标识。
- 性能: 仅控制台输出，不影响主流程。

## 测试与部署
- 测试: 开发环境触发 @ 并检查日志。
- 部署: 调试完成后可移除日志。
