## Why

移动端的跑团面板（地图、先攻、状态）目前只实现了基础功能，与 Web 端存在显著差距。Web 端拥有可视化网格地图、可拖拽 Token、可排序先攻表、自定义参数、宝可梦规则支持、以及带颜色编码的状态面板等完整功能。移动端需要补齐这些能力以提供一致的跑团体验。

## What Changes

### 地图面板
- 在地图图片上渲染可视化网格覆盖层，支持配置行列数和网格颜色
- Token 以角色头像形式显示在网格对应位置上（而非纯文本列表）
- 支持点击网格单元格放置/移动 Token（移动端不需要拖拽，用点选交互）
- Token 大小根据网格密度动态缩放

### 先攻面板
- 支持按不同列排序（先攻值、名称、HP）及切换排序方向
- 支持自定义参数列（手动输入或绑定角色属性）
- 支持行内编辑先攻值、HP 等字段
- 宝可梦规则支持：等级列、行动点管理、下一回合重置行动点
- 导入角色时自动处理重名（追加后缀）

### 状态面板
- 角色行显示头像
- 主要属性（HP/MP/SAN/SP）使用语义颜色编码
- 区分主要属性和次要属性，显示最大值（如 "HP 45/100"）
- 当前角色高亮标记
- 无状态角色单独分组显示在底部
- 能力同步加载指示器

## Capabilities

### New Capabilities
- `map-grid-overlay`: 地图图片上的可视化网格覆盖层渲染和 Token 可视化放置交互
- `initiative-advanced`: 先攻表的排序、自定义参数、行内编辑和宝可梦规则支持
- `state-visual-enhancement`: 状态面板的头像、颜色编码、属性分组和视觉层次优化

### Modified Capabilities

## Impact

- `apps/mobile/src/features/chat/MapPanel.tsx` — 重写为可视化网格地图
- `apps/mobile/src/features/chat/InitiativePanel.tsx` — 扩展排序、参数、编辑功能
- `apps/mobile/src/features/chat/StatePanel.tsx` — 增强视觉展示
- `apps/mobile/src/features/chat/initiativeTypes.ts` — 扩展类型定义支持自定义参数
- 可能需要新增组件：网格覆盖层组件、Token 组件、行内编辑组件
- 数据层（roomDndMap hooks、useRoomExtra）无需修改，现有 API 已支持所需数据
