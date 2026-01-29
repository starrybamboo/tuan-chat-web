# 变更提案: Blocksuite 画布全屏遮挡 @ 弹窗修复（CSS 全屏兜底）

## 需求背景
全屏画布是通过 blocksuite-frame 的 CSS 视口占满（非 Fullscreen API），此前弹窗挂载到 top document 仍被宿主 iframe 层级遮挡。

## 变更内容
1. @ 弹窗默认挂载在当前 iframe 文档，避免被宿主 iframe 覆盖
2. 保留 Fullscreen API 场景的 fullscreenElement 兜底

## 影响范围
- 模块: chat / blocksuite
- 文件: app/components/chat/infra/blocksuite/quickSearchService.ts

## 核心场景
### 需求: CSS 全屏画布下 @ 弹窗可见
**模块:** blocksuite
在 blocksuite-frame 以 CSS 方式全屏时，触发 @ 弹窗应显示在最上层并可交互。

#### 场景: CSS 全屏 + @ 触发
- 条件: blocksuite-frame 使用 h-screen/w-screen 全屏
- 预期结果: 弹窗显示在 iframe 内最上层，且可键盘/鼠标操作

## 风险评估
- 风险: 与宿主弹层层级策略不同步
- 缓解: 仅调整 blocksuite-frame 内挂载策略，不影响宿主层级
