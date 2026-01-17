# 变更提案: Blocksuite @ 提及调试日志

## 需求背景
空间描述的 @ 提及仍会重复插入且弹窗不关闭，需要通过控制台日志定位触发链路。

## 变更内容
1. 在菜单渲染、成员选择、插入结果、弹窗关闭处增加控制台日志。
2. 记录关键上下文（query、memberId、inserted 结果、锁定状态）。

## 影响范围
- 模块: Blocksuite 提及集成
- 文件: app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts, app/components/chat/infra/blocksuite/services/mentionPicker.ts
- API: 无
- 数据: 无

## 核心场景

### 需求: @ 提及调试信息可观测
**模块:** Blocksuite 提及集成
在空间描述选择成员时，控制台可输出完整触发路径信息。

#### 场景: 空间描述选择成员
前置条件: 空间描述编辑器已打开，输入 `@` 并出现成员弹窗。
- 预期结果: 控制台记录菜单请求、选择动作、插入结果、弹窗关闭/锁定状态。

## 风险评估
- 风险: 调试日志可能在生产环境产生噪声。
- 缓解: 使用条件开关（如仅在开发环境输出）并可快速移除。
