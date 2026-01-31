# 变更提案: Blocksuite 全屏 @ 弹窗可见性修复（补充）

## 需求背景
已有修复在全屏画布下仍未生效，推测与 Fullscreen API 的可见范围限制有关，需要确保弹窗挂载在 fullscreenElement 内或对应 iframe 文档中。

## 变更内容
1. 在 @ 弹窗创建时识别 fullscreenElement
2. 若 fullscreenElement 为承载 blocksuite 的 iframe，则回退到当前 iframe 文档挂载
3. 否则将弹窗挂载到 fullscreenElement 内，确保全屏可见

## 影响范围
- 模块: chat / blocksuite
- 文件: app/components/chat/infra/blocksuite/quickSearchService.ts

## 核心场景
### 需求: 全屏画布下 @ 弹窗可见
**模块:** blocksuite
在 blocksuite 画布全屏时触发 @ 弹窗，应在最上层显示且可交互。

#### 场景: 画布全屏 + @ 触发
- 条件: 画布已进入全屏
- 预期结果: 弹窗显示在全屏画布之上，可键盘/鼠标操作

## 风险评估
- 风险: fullscreenElement 挂载范围判断错误导致弹窗不可见
- 缓解: 在 iframe 方案与顶层方案之间做可用性判定并兜底到当前文档
