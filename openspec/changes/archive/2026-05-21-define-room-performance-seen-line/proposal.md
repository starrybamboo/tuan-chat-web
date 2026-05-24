## Why

房间消息列表现在同时承担“阅读进度”和“房间演出状态”的职责，但此前没有明确规格说明哪条消息算作已经看完、背景/特效应在何时切换。这个边界一旦靠实现细节隐式决定，就容易在虚拟列表、输入框高度变化、附件展开或 overscan 调整后出现演出提前/滞后。

## What Changes

- 定义 Web 房间消息列表的“演出已读线”：以聚合输入框上边缘作为消息看完和房间演出推进的判定线。
- 定义背景、清背景、场景特效等房间演出状态如何根据已读线前的消息流推导。
- 定义虚拟列表、overscan、输入框高度变化、附件预览展开时演出判定不得依赖渲染范围尾部。
- 明确该机制只影响房间内联背景/特效随滚动变化；WebGAL 实时渲染历史脚本仍遵循既有 WebGAL 实时渲染规则。

## Capabilities

### New Capabilities

- `room-performance-seen-line`: 定义房间消息列表的演出已读线、消息看完判定，以及背景/特效随滚动推进的规则。

### Modified Capabilities

- 无。

## Impact

- 影响 Web 房间消息列表与输入区布局：
  - `app/components/chat/chatFrameList.tsx`
  - `app/components/chat/hooks/useChatFrameVisualEffects.ts`
  - `app/components/chat/room/roomComposerPanel.tsx`
- 影响房间内联背景/场景特效状态推导，不改变消息 API、消息模型或 WebGAL 场景脚本映射。
- 需要测试覆盖演出已读线索引选择、输入框上边缘回退、背景/清背景/特效推导。
