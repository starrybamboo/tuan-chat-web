## Context

移动端跑团面板（地图、先攻、状态）已有基础实现，放置在右抽屉的 `RightDrawerPanel` 中，通过底部 tab 切换。当前实现使用简单列表展示数据，缺少 Web 端的可视化网格地图、可排序先攻表、颜色编码状态等功能。

现有数据层（`roomDndMap` hooks、`useRoomExtra`、`useRoomStateRuntime`）已完整支持所需数据结构。地图底图、网格尺寸和网格颜色继续走 `roomDndMap`，而 token 的放置、移动、移除与选中状态改由 `STATE_EVENT` 记录。

## Goals / Non-Goals

**Goals:**
- 地图面板：在图片上渲染网格覆盖层，Token 以头像形式显示在网格位置，支持点选放置/移动
- 先攻面板：支持排序、自定义参数列、行内编辑、宝可梦规则特性
- 状态面板：角色头像、语义颜色编码、主次属性分离、当前角色高亮

**Non-Goals:**
- 不实现拖拽交互（移动端用点选代替）
- 不实现 WebGAL 和文档 tab（Web 端独有）
- 不修改后端 API 或数据结构
- 不实现地图链接复制功能（移动端无此需求）

## Decisions

### 1. 地图网格覆盖层：React Native SVG

**选择**: 使用 `react-native-svg` 绘制网格线和 Token

**理由**: Web 端使用 CSS `background-image` linear-gradient 实现网格，但 React Native 不支持此 CSS 特性。SVG 是 RN 中绘制精确网格线的标准方案，且 `react-native-svg` 已是 Expo 内置依赖。

**替代方案**:
- Canvas (react-native-skia): 性能更好但引入重依赖，网格场景不需要
- 纯 View 拼接: 大网格时 View 数量爆炸，性能差

### 2. Token 放置交互：两步点选 + 状态事件

**选择**: 先点击未放置角色选中，再点击网格单元格放置；点击已放置 Token 可选中后点击新位置移动。token 的位置与选中状态通过 `STATE_EVENT` 写入，地图配置仍沿用 `roomDndMap`。

**理由**: 与 Web 端移动端模式一致（Web 端在 `isMobile` 时也用 click-to-place 而非 drag）。触摸屏上拖拽与 ScrollView 滚动冲突，同时位置状态应与其他战斗状态统一到事件流。

### 3. 先攻表行内编辑：TextInput 覆盖

**选择**: 点击单元格时将 ThemedText 替换为 TextInput，失焦时保存

**理由**: 移动端没有 double-click 概念，单击进入编辑模式更自然。与 Web 端的 double-click-to-edit 语义等价。

### 4. 状态面板颜色编码

**选择**: 硬编码主要属性 key 到颜色的映射（HP→红、MP→蓝、SAN→黄、SP→绿），其余属性使用默认灰色

**理由**: 与 Web 端一致，这些是 TRPG 通用约定。

### 5. 地图图片尺寸计算

**选择**: 使用 `Image.getSize` 获取原始尺寸，结合容器 `onLayout` 计算 object-contain 后的实际渲染区域

**理由**: 网格覆盖层必须精确对齐图片渲染区域（考虑 letterboxing），与 Web 端 `useContainedImageRect` 逻辑等价。

## Risks / Trade-offs

- [SVG 性能] 大网格（50x50+）时 SVG 线条数量多 → 使用 `<Path>` 合并所有网格线为单个路径，避免大量 `<Line>` 元素
- [Token 头像加载] 多个角色头像同时加载可能卡顿 → 使用 expo-image 的缓存机制，Token 组件使用 React.memo
- [行内编辑键盘遮挡] 编辑先攻值时键盘可能遮挡输入框 → ScrollView 配合 `keyboardShouldPersistTaps` 和 `scrollToFocusedInput`
