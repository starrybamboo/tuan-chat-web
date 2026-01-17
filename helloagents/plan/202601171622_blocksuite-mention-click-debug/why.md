# 变更提案: Blocksuite @ 提及点击链路调试日志

## 需求背景
开发环境中按 `@` 能出现提及弹窗，但点击弹窗项不会输出我们已有的菜单/插入日志，说明当前触发链路不在我们已埋点的位置，需要补齐“点击事件层”的调试信息以定位真正的插入实现。

## 变更内容
1. 在 blocksuite-frame（iframe 内）捕获并上报 pointerdown/click 事件（仅当事件路径包含 mention 相关 DOM 线索时）。
2. 宿主侧继续打印 frame 上报的 debug-log，便于直接在主控制台观察。

## 影响范围
- 模块: blocksuite-frame 调试链路
- 文件: app/routes/blocksuiteFrame.tsx
- API: 无
- 数据: 无

## 核心场景

### 需求: 点击提及项可观测
**模块:** blocksuite-frame
点击提及弹窗的候选项时，控制台能输出点击事件路径摘要（用于定位真实插入逻辑）。

#### 场景: 空间描述选择提及项
前置条件: 空间描述编辑器已打开，输入 `@` 并出现提及弹窗。
- 预期结果: 控制台出现 `[BlocksuiteFrameDebug] BlocksuiteFrame pointerdown/click ...` 日志。

## 风险评估
- 风险: 事件监听与日志可能过多。
- 缓解: 仅 DEV 输出，且只在命中 mention 线索时才打印摘要。
