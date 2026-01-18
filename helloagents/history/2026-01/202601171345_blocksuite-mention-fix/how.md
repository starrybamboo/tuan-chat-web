# 技术设计: Blocksuite @ 提及弹窗重复插入修复

## 技术方案
### 核心技术
- Blocksuite LinkedWidgetConfigExtension 菜单渲染与动作回调
- mentionPicker 插入选区与文本事务

### 实现要点
- 在成员菜单 action 中先执行插入，再调用 abort() 关闭弹窗，确保弹窗收敛。
- 在 insertMentionAtCurrentSelection 中加入轻量级防重入保护，避免同一选择被多次写入。
- 维持现有事务写入与空格追加逻辑，确保输入体验一致。

## 安全与性能
- 安全: 不新增外部数据写入，仅使用已有成员 ID 与名称。
- 性能: 仅增加一次性状态判断，不引入额外 I/O。

## 测试与部署
- 测试: 手动验证空间描述中 @ 提及的点击与回车路径。
- 部署: 随常规前端发布流程上线。
