# module-sidebar 前端 UI 实现说明（详细版）

本文档面向该工作区 `c:\\Users\\super\\Desktop\\code\\module-sidebar`，聚焦其 UI 体系与关键界面实现，结合实际代码（已通读 `components/content-manager.tsx`），对整体设计风格、组件组合方式与交互细节做可复用的说明与建议。

注意：以下对 `content-manager.tsx` 的描述为源码级别详解；其他组件按目录与命名给出结构化说明与对齐建议，不臆造未提供源码的实现细节。

---

## 1. 项目与技术栈总览

- 框架与运行时
	- Next.js App Router（`app/`）
	- React 18（`"use client"` 客户端组件）
- 样式与 UI 基座
	- Tailwind CSS（`app/globals.css` + 原子类）
	- shadcn/ui 组件库（`components/ui/` 下 Button、Input、Card、Tabs、Badge、Dialog、AlertDialog、Textarea、Select、Label 等）
	- lucide-react 图标（Users、Package、MapPin、BookOpen 等）
- 状态与业务
	- 本地模块域状态：`hooks/use-module-store`（提供实体增删改查与筛选）
	- 类型定义：`types/`（模块与实体类型）

UI 一致性由“shadcn/ui + Tailwind Token”保障，常用语义色/修饰：
- 文本：`text-muted-foreground`
- 背景高亮：`accent`
- 危险动作：`destructive` + `destructive-foreground`
- 边距/排版：`space-y-*`、`grid`、`line-clamp-*`、`truncate` 等

---

## 2. 目录级 UI 组件结构（按角色划分）

- `components/module-sidebar.tsx`
	- 侧栏容器与布局入口（推测：组织模块选择/管理与内容页切换）
- `components/module-manager.tsx`
	- 模组（Module）选择与管理（推测：为空态/入口引导）
- `components/content-manager.tsx`（已通读）
	- 角色/物品/地点/剧情的“内容管理器”主界面与全部 CRUD UI
- `components/plot-map.tsx`
	- 剧情节点的可视映射（推测：与剧情 entity 交互或可视化）
- `components/theme-provider.tsx`
	- 主题/暗色模式 Provider（对 shadcn/ui 主题适配）
- `components/ui/*`
	- shadcn/ui 抽象的原子与复合 UI 组件

本文第 3、4、5 章将对 `content-manager.tsx` 的 UI 逐层拆解；第 6 章给出其余模块的对齐建议与可复用规范。

---

## 3. ContentManager 主界面（整体布局与状态切换）

入口：`components/content-manager.tsx` 导出 `ContentManager`

- 空态处理（未选择模组）
	- 使用 `Card` 包裹，居中提示与 `BookOpen` 图标
	- 语义与视觉：空态信息 `text-muted-foreground`，图标 muted 低饱和
- 顶部搜索栏
	- 左侧绝对定位 `Search` 图标 + 右侧 `Input`（通过 `pl-9` 留出图标占位）
	- 与全局筛选 `searchFilter.query` 相连（来自 `useModuleStore`）
- 分类 Tabs（四等分）
	- `Tabs` + `TabsList` + `TabsTrigger`
	- 四列网格：`grid w-full grid-cols-4`
	- 每个 Trigger 为“图标 + 文案”
		- 角色（`Users`）、物品（`Package`）、地点（`MapPin`）、剧情（`BookOpen`）
	- 当前激活项由 `activeTab` 控制（本地 `useState`）
- 每个 Tab 下的“列表头 + 列表”
	- 列表头：显示“{类别}列表（数量）” + 新建 `Button`（`Plus`）
	- 列表本体：复用 `<ItemList items type onEdit onDelete />`

UI 关键点
- 视觉对齐：四列等宽、图标固定 16px（`h-4 w-4`），文字 14px（`text-sm`）
- 状态明显：Hover/Accent、空态卡片、删除确认二次弹窗
- 可扩展性：列表主体为统一组件 `ItemList`，不同实体类型通过 `type` 增量差异化

---

## 4. ItemList 列表卡片（信息层次与交互）

入口：`content-manager.tsx` 内部方法 `ItemList`

- 空列表
	- `Card` + 居中“暂无数据”文案
- 列表项卡片
	- `Card` `hover:bg-accent/50` 提示可互动
	- Header 区
		- 左：标题（`CardTitle`，`name` 或 `title`）+ 可选描述（`CardDescription`，`line-clamp-2`）
		- 右：编辑按钮 + 删除按钮（`AlertDialog` 二次确认）
	- Plot 类型的补充信息（`CardContent`）
		- 小徽章 `Badge`（`type`：`start`/`event`/`choice`/`end`）
		- 连接数徽章（`connections.length`）

交互与可用性
- 编辑：`onEdit(item)` → 外层打开编辑对话框
- 删除：`AlertDialog` 二次确认，强调不可撤销；确认按钮使用 `destructive` 方案
- 文本溢出处理：标题 `truncate`、描述两行截断（`line-clamp-2`）

样式要点
- 信息层次：标题（`font-medium`）> 描述（`text-xs`）
- 操作区：Icon Button（`variant="ghost"` `size="sm"` `h-8 w-8 p-0`）
- 状态色：删除 Hover 转为 `text-destructive`

---

## 5. 创建/编辑对话框（表单字段与提交流程）

### 5.1 CreateItemDialog（按实体类型自适配字段）

- 通用字段
	- 名称/标题：plot 用 `title`，其余用 `name`（`Label` + `Input`）
	- 描述：`Textarea` `rows={3}`
- 类型特异
	- `item`：额外“类型”文本输入
	- `plot`：节点类型 `Select`（`start/event/choice/end`），默认 `event`
- 提交流程
	- `plot`：注入 `position`（随机坐标）、`connections=[]`、`characters/items/locations=[]`
	- 其他：注入 `attributes={}`、`properties={}`；`location` 额外 `connections=[]`
- 表单状态
	- 本地 `formData`（`useState`）
	- `Dialog` 关闭时重置；创建按钮在 `name/title` 非空时启用

UI/UX 细节
- 字段排布：`Label` 顶部，组件下方提示 Placeholder
- 行为一致性：各类型仅增量字段不同，其余结构一致
- 可扩展：后续可按实体 schema 动态渲染字段组

### 5.2 EditItemDialog（就地编辑当前实体）

- 初始值：`useState(item)` 深拷贝出 `formData`
- 字段同 Create，但为编辑态
- `plot` 类型同样可改“节点类型”
- 提交：`onSubmit(formData)`

可用性提示
- 编辑与创建保持表单结构一致，降低学习成本
- 保存与取消置于 `DialogFooter`；取消仅关闭，不重置外层状态

---

## 6. 与数据层结合（useModuleStore）与筛选

- `ContentManager` 依赖 `hooks/use-module-store` 提供的接口：
	- `currentModule`、`searchFilter`、`setSearchFilter`
	- `getFilteredCharacters/Items/Locations/PlotNodes`
	- `add/update/delete` 针对四类实体的方法
- 搜索行为
	- 单一输入框更新 `searchFilter.query`
	- 列表均使用已过滤的数据源，保证一致的检索体验

UI 与数据的解耦
- UI 组件不关心过滤与排序细节，只消费“已过滤列表”
- 创建/编辑对话框仅产出数据结构，实际落库与状态同步由 Store 承担

---

## 7. 视觉规范与可用性

- 图标与文本对齐：`flex items-center gap-1/1.5`
- 列表卡片：`hover` 明显、卡片内标题/描述层级清晰
- 按钮密度：工具按钮 `h-8 w-8`，列表头按钮 `size="sm"`
- 空态与错误防御：空列表有卡片提示，删除有确认弹窗
- 无障碍（a11y）
	- shadcn/ui 组件内置 role/aria 语义（`Dialog`、`AlertDialog`、`Tabs` 等）
	- `Label` 绑定 `htmlFor`，`Select` 有可见 `Label`
- 响应式
	- 栅格与内边距原子类可在小屏保持可读（`grid-cols-4` 可按需求在小屏折行）

---

## 8. 可复用设计模式与规范建议

- Tab 栏规范（已在 `ContentManager` 体现）
	- 四等分网格 + 图标 + 文案
	- 触发器采用 `TabsTrigger`，统一尺寸 `h-9`、文字 `text-sm`、图标 16px
	- 活动态视觉对齐：高亮背景与语义色
- 列表卡片规范
	- 标题 + 可选描述 + 右上角工具区
	- 空态卡片复用一致模板
- 对话框表单规范
	- `Label` + 控件 + placeholder
	- Footer 统一“取消 / 确认”排列，危险操作用语义色
- Badge 用法
	- 用于描述轻量属性（例如剧情节点类型、连接计数）
- 颜色 Token
	- `destructive/secondary/outline` 等统一来自组件库 variant，避免硬编码颜色
- 业务字段映射
	- `plot` 的 `title/name` 差异通过统一映射层处理，避免分支散落

---

## 9. 易错点与改进建议（content-manager.tsx）

1) 编辑对话框的类型派生
- 现状：`type={activeTab.slice(0, -1)}`
	- `characters` → `character`（OK）
	- `items` → `item`（OK）
	- `locations` → `location`（OK）
	- `plot` → `"plo"`（错误）
- 建议：使用显式映射，避免字符串裁剪

```ts
const singular = {
	characters: "character",
	items: "item",
	locations: "location",
	plot: "plot",
}[activeTab]!;
```

2) plot position 随机坐标
- 现状：创建剧情节点时 `position` 随机（`x: 0-400, y: 0-300`）
- 建议：改为“视口中心”或“相对最后节点偏移”，避免重叠；并由可视 map 组件决定布局

3) 表单默认值一致性
- `plot` 的 `type` 默认 `event`；`item` 的 `type` 默认为空
- 建议：为所有必填/常用字段给出合理默认值，并在 UI 上清晰提示

4) 删除操作的反馈
- 建议：删除成功后触发 toast（`components/ui/sonner` 或 `use-toast`），增强反馈闭环

---

## 10. 与其他模块的 UI 对齐建议

虽然未直接阅读 `module-manager.tsx`、`module-sidebar.tsx`、`plot-map.tsx` 源码，但为保证产品一致性，建议：

- `module-sidebar.tsx`
	- 保持侧栏的分组/项使用一致的 icon + 文案排布
	- 选中态、高亮、Hover 效果沿用 `TabsTrigger` 的视觉语言
- `module-manager.tsx`
	- 模组卡片/空态/操作条按钮样式与 `ContentManager` 列表卡片/工具按钮对齐
- `plot-map.tsx`
	- 节点徽章（`Badge`）与节点类型色彩与列表中一致
	- 节点选中态/连接线 `Hover/Selected` 有清晰高亮
	- 新建节点入口与 `ContentManager` 的“新建”动作一致（文案与位置）

---

## 11. 组件清单与用途（content-manager.tsx 涉及）

- `Button`：主操作/图标按钮/幽灵态工具按钮
- `Input`：搜索输入、名称输入
- `Textarea`：描述输入
- `Select`：剧情节点类型选择
- `Card`：空态卡片、列表项卡片
- `Tabs`：四类实体切换
- `Badge`：剧情节点轻量信息
- `Dialog`：创建/编辑表单
- `AlertDialog`：删除二次确认
- `Label`：表单可达性绑定
- `lucide-react`：视觉语义图标

---

## 12. 小结

module-sidebar 的 UI 基于 shadcn/ui + Tailwind 的“语义组件 + 原子类”方案，`ContentManager` 以“统一骨架 + 类型增量”实现四类实体的 CRUD 界面。通过：
- 四列 Tabs 导航
- 列表卡片的统一信息层次
- 表单对话框的通用结构
- Badge 与 Icon 的轻量信息表达

实现了风格统一、易复用、可维护的 UI 体系。建议按本文规范将 `module-manager`、`module-sidebar`、`plot-map` 对齐同一套视觉与交互准则，并修复已指出的派生类型小问题，以获得一致而可靠的用户体验。

如需，我可以基于上述规范，输出可复用的 `Tabs/TabsList/TabsTrigger` 封装与“实体列表卡片”组件，便于跨页面复用与样式统一。
