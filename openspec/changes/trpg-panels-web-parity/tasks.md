## 1. 地图面板 - 网格覆盖层与 Token 可视化

- [x] 1.1 创建 `MapGridOverlay` 组件，使用 react-native-svg 绘制网格线（合并为单个 Path）
- [x] 1.2 实现 `useContainedImageRect` hook，计算 object-contain 后图片的实际渲染区域（left/top/width/height）
- [x] 1.3 创建 `MapToken` 组件，显示角色头像圆形图片，支持选中态高亮
- [x] 1.4 实现 Token 位置计算逻辑（根据 rowIndex/colIndex 和网格尺寸计算百分比定位）
- [x] 1.5 实现 Token 动态缩放（根据网格密度计算 token 尺寸，范围 12-32px）
- [x] 1.6 重写 `MapPanel` 地图预览区域：替换为带网格覆盖层和 Token 的交互式地图视图
- [x] 1.7 实现两步点选交互：选中未放置角色 → 点击网格单元格放置
- [x] 1.8 实现 Token 移动交互：点击已放置 Token 选中 → 点击新位置移动
- [x] 1.9 实现网格单元格点击检测（根据触摸坐标计算对应的 rowIndex/colIndex）
- [x] 1.10 更新未放置角色列表，显示角色头像并支持点击选中

## 2. 先攻面板 - 排序与行内编辑

- [x] 2.1 扩展 `Initiative` 类型，增加 `extras: Record<string, number | string>` 字段
- [x] 2.2 定义 `InitiativeParam` 类型（key, label, source: "manual" | "roleAttr", atrKey?）
- [x] 2.3 实现可排序列表头组件，支持点击切换排序列和排序方向
- [x] 2.4 实现排序逻辑（支持按 value、name、hp、自定义参数列排序）
- [x] 2.5 创建 `InlineEditCell` 组件，点击显示 TextInput，失焦保存
- [x] 2.6 将先攻列表改为表格布局，每行显示所有列（名称、先攻值、HP、自定义参数）
- [x] 2.7 实现自定义参数管理 UI（添加/删除参数，选择来源类型）
- [x] 2.8 实现 roleAttr 类型参数的自动值填充（从角色能力数据读取）

## 3. 先攻面板 - 宝可梦规则支持

- [x] 3.1 检测当前 ruleId 是否为宝可梦规则（ruleId === 7）
- [x] 3.2 宝可梦模式下显示等级列，从角色属性自动同步
- [x] 3.3 实现行动点显示和管理逻辑
- [x] 3.4 实现"下一回合"按钮，重置所有绑定角色的行动点
- [x] 3.5 导入角色时自动处理重名（追加数字后缀）

## 4. 状态面板 - 视觉增强

- [x] 4.1 为角色行添加头像显示（使用 expo-image，圆形裁剪）
- [x] 4.2 实现主要属性颜色映射（HP→红、MP→蓝、SAN→黄、SP→绿）
- [x] 4.3 修改属性 pill 显示格式：当 base !== derived 时显示 "current/max"
- [x] 4.4 实现当前角色高亮（accent 边框 + "当前" badge）
- [x] 4.5 将无状态数据的角色分组到底部独立区域
- [x] 4.6 添加能力同步加载指示器（"正在同步角色基础变量…"）

## 5. 集成与验证

- [x] 5.1 确保 RightDrawerPanel 正确传递所有新增 props
- [x] 5.2 运行 TypeScript 类型检查通过
- [ ] 5.3 在模拟器中验证地图网格覆盖层渲染和 Token 交互
- [ ] 5.4 在模拟器中验证先攻表排序、编辑和自定义参数功能
- [ ] 5.5 在模拟器中验证状态面板视觉增强效果
