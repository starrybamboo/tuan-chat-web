# 变更提案: sidebar-material-package-tree

## 元信息
```yaml
类型: 重构/优化
方案类型: implementation
优先级: P1
状态: 已完成
创建: 2026-03-28
```

---

## 1. 需求

### 背景
当前空间侧边栏树只支持房间和文档两类节点，局内素材包仍然需要从空间头部菜单进入 `material` 详情页。这导致素材包和空间侧边栏的心智分裂，无法像房间或文档一样被快速定位与切换。

### 目标
- 让局内素材包成为空间侧边栏树中的一等节点。
- 从侧边栏点击某个素材包时，直接打开局内素材包工作区并定位到该素材包。
- 保持现有局内素材包工作区、空间详情页 `material` tab 和独立路由的复用关系。
- 兼容旧的 `sidebarTree` 数据，不破坏现有房间/文档侧边栏体验。

### 约束条件
```yaml
时间约束: 本轮实现需在一次修改中完成，并保留现有空间详情与侧边栏能力
性能约束: 不引入明显的额外渲染循环；避免 useEffect 和 selector 造成重复更新
兼容性约束: 旧 sidebarTree JSON 需继续可读；不修改后端接口
业务约束: 使用 pnpm；修改后执行 pnpm typecheck；保留现有局内素材包工作区的查询/编辑/导入能力
```

### 验收标准
- [x] 空间侧边栏可渲染素材包节点，并能在旧 tree 数据上自动补齐素材包分类
- [x] 点击素材包节点会打开 `/chat/:spaceId/material` 并通过 `spacePackageId` 定位到对应素材包
- [x] 局内素材包工作区可与 URL 选中态同步：打开、关闭、创建、删除后 URL 状态正确
- [x] 删除素材包后，侧边栏中的失效素材包节点会被清理
- [x] 关键类型与默认树行为有自动化测试覆盖

---

## 2. 方案

### 技术方案
扩展 `SidebarLeafNode.type`，新增 `material-package` 节点类型，并在 `sidebarTree.ts` 中把局内素材包纳入默认树和归一化逻辑。通过为素材包建立系统分类 `cat:materials`，在现有侧边栏树中自动补齐素材包节点。聊天页额外查询当前空间的局内素材包列表，将其传入侧边栏树状态和渲染链路；新增素材包节点组件，在点击时导航到 `/chat/:spaceId/material?spacePackageId=:id`。`SpaceMaterialLibraryPage` 改为由 URL 查询参数驱动选中素材包，使聊天页内嵌模式与独立页面模式共用同一套选中逻辑。

### 影响范围
```yaml
涉及模块:
  - chat-sidebar-tree: 扩展树节点类型、默认树、归一化、拖拽渲染链路
  - space-detail-routing: 补充素材包节点到 material 页的 URL 同步
  - material-library: 将局内素材包页切到 URL 驱动的选中态
预计变更文件: 12
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 旧 sidebarTree 中没有素材包分类，升级后节点无法出现 | 中 | 在 normalize 阶段自动补齐 `cat:materials` |
| 素材包查询未返回时误删旧节点 | 中 | 区分“未加载”和“已加载为空”两种状态 |
| 路由查询参数与页面内部状态互相覆盖 | 中 | 让 `SpaceMaterialLibraryPage` 以 `spacePackageId` 为单一来源，并在写回前做相等判断 |
| 新增节点类型后拖拽链路分支遗漏 | 中 | 将 `material-package` 纳入 DraggingItem 和分类项分发，并用 typecheck+单测兜底 |

---

## 3. 技术设计（可选）

> 涉及架构变更、API设计、数据模型变更时填写

### 架构设计
```mermaid
flowchart TD
    A[ChatPage 查询局内素材包] --> B[ChatRoomListPanel]
    B --> C[sidebarTree normalize/buildDefault]
    C --> D[material-package 节点渲染]
    D --> E[/chat/:spaceId/material?spacePackageId=ID]
    E --> F[SpaceMaterialLibraryPage]
    F --> G[MaterialPackageEditorModal]
```

### API设计
#### GET/POST/PUT/DELETE 现有 spaceMaterialPackage 接口
- **请求**: 继续复用现有 `SpaceMaterialPackage*Request`
- **响应**: 继续复用现有 `SpaceMaterialPackageResponse`
- **补充**: 不新增后端接口；前端仅增加 `spacePackageId` 查询参数作为页面内状态

### 数据模型
| 字段 | 类型 | 说明 |
|------|------|------|
| `SidebarLeafNode.type` | `"room" \| "doc" \| "material-package"` | 侧边栏叶子节点类型扩展 |
| `SidebarLeafNode.targetId` | `number \| string` | 对素材包节点承载 `spacePackageId` |
| `cat:materials` | `SidebarCategoryNode.categoryId` | 系统素材包分类 ID |

---

## 4. 核心场景

> 执行完成后同步到对应模块文档

### 场景: 从空间侧边栏打开某个素材包
**模块**: chat-sidebar-tree / space-detail-routing / material-library
**条件**: 当前空间存在局内素材包，用户点击侧边栏素材包节点
**行为**: 侧边栏导航到 `/chat/:spaceId/material?spacePackageId=:id`，局内素材包页据此打开对应素材包
**结果**: 用户像切换房间一样切换素材包，且当前选中项在侧边栏高亮

### 场景: 旧侧边栏树升级到新模型
**模块**: chat-sidebar-tree
**条件**: 旧 `treeJson` 中只有房间/文档节点，没有素材包分类
**行为**: 归一化时根据当前空间素材包列表自动补齐 `cat:materials`
**结果**: 老空间无需重置侧边树也能出现素材包栏

### 场景: 删除素材包后清理侧边栏节点
**模块**: material-library / chat-sidebar-tree
**条件**: 局内素材包被删除，URL 仍指向原素材包
**行为**: 查询刷新后，页面清空 `spacePackageId`，树归一化时移除失效节点
**结果**: 侧边栏与工作区不会保留已删除素材包的悬空状态

---

## 5. 技术决策

> 本方案涉及的技术决策，归档后成为决策的唯一完整记录

### sidebar-material-package-tree#D001: 采用 `material-package` 叶子节点并复用 material 详情页
**日期**: 2026-03-28
**状态**: ✅采纳
**背景**: 需要让素材包成为空间侧边栏的一等元素，同时避免复制一套新的工作区页面。
**选项分析**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: `material-package` 节点 + 复用 `/chat/:spaceId/material` | 侧边栏心智统一；工作区零重复；支持直接定位具体素材包 | 需要扩展树模型与路由同步 |
| B: 顶层并行 `materials` 区块 | 对 room/doc 侵入更小 | 形成两套侧边栏体系，后续维护分叉 |
**决策**: 选择方案 A
**理由**: 当前侧边栏树和空间详情页都已成熟，最合适的方向是让素材包接入现有树模型，并继续复用现有局内素材包工作区，而不是重新发明一套并行容器。
**影响**: 影响 `sidebarTree.ts`、聊天页侧边栏链路、局内素材包页面的选中态实现

---

## 6. 成果设计

> 含视觉产出的任务由 DESIGN Phase2 填充。非视觉任务整节标注"N/A"。

### 设计方向
- **美学基调**: 延续现有聊天侧边栏的“工具型工作台”气质，不另起一套视觉语言
- **记忆点**: 素材包节点与房间/文档并列出现，但通过封面缩略图和 `PackageIcon` 让识别足够直接
- **参考**: 现有 `roomSidebarDocItem` 与 `SpaceMaterialLibraryWorkspace` 的视觉表达

### 视觉要素
- **配色**: 复用现有 base/info 体系，以轻量高亮表达当前选中的素材包节点
- **字体**: 继续沿用项目当前聊天侧边栏字体体系
- **布局**: 保持房间/文档/素材包在同一纵向树结构中，避免新增并列面板
- **动效**: 沿用现有 hover/active 的轻反馈，不引入额外动画
- **氛围**: 优先保持与聊天侧边栏的一致性，不强行增加装饰

### 技术约束
- **可访问性**: 节点支持键盘 Enter/Space 激活，保持 aria-pressed 语义
- **响应式**: 继续遵循现有侧边栏和 `SpaceMaterialLibraryPage` 的桌面/移动端适配
