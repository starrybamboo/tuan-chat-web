# 技术设计: Blocksuite @ 提及调试日志

## 技术方案
### 核心技术
- Blocksuite LinkedWidgetConfigExtension 菜单构建与 action 回调
- mentionPicker 插入路径

### 实现要点
- 在菜单请求入口输出 query、锁定状态与是否命中成员菜单。
- 在成员 action 输出 memberId、inserted 结果、关闭行为。
- 在 mentionPicker 内输出选区、插入位置与防重入判断结果。

## 安全与性能
- 安全: 日志不包含敏感信息，仅记录 userId 和状态。
- 性能: 仅控制台输出，不影响主流程。

## 测试与部署
- 测试: 手动验证控制台输出覆盖完整路径。
- 部署: 调试完成后可移除或按需保留。
