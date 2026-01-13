# SidebarTree v2：可编辑分类 + 直接拖拽（KP）

本文档记录左侧侧边栏（房间 + 文档）的 v2 形态：分类本身可编辑（类似 Discord 分类/文件夹），KP（空间 Owner/裁判）无需进入“编辑模式”，直接拖拽即可完成排序/移动，并支持新增/重命名/删除分类。

## 背景

- 频道树数据存于后端 `space_sidebar_tree`（`tree_json`），前端负责渲染与编辑。
- 频道树写入权限：后端限制仅裁判（KP / `member_type=1`）可保存；文档可见性目前仍是前端 gate（非 KP 不展示 doc 节点，且 doc 路由也会拦截）。
- v2 开始：分类是可编辑的一层“容器”，不再固定 `TEXT/VOICE/DOC` 三类。

## 功能说明

### 1) 直接拖拽排序/移动（HTML5 DnD）

KP 默认即可拖拽：

- 分类：可拖拽排序（改变分类顺序）。
- 节点（房间/文档）：
  - 支持同分类内拖拽排序
  - 支持跨分类拖拽移动

非 KP：仅展示，无法拖拽编辑。

### 2) 新增/移除节点

KP：

- 新增：在分类右侧菜单选择“添加频道…”，从下拉框选择“未在树中出现的房间/文档”并添加。
- 移除：
  - 房间：在房间菜单中选择“从侧边栏移除”
  - 文档：点击“移除”按钮

### 3) 自动保存/重置

- 自动保存：KP 的拖拽/新增/移除/分类变更都会立即调用 `onSaveSidebarTree(tree)` 写回后端（无需手动点“保存”）。
- 重置默认：调用 `onResetSidebarTreeToDefault()` 将侧边栏恢复为默认树结构。

### 4) 同步刷新（WS 推送）

- 当 KP 保存成功后，后端会向该空间的在线成员推送 `type=22`（空间频道树变更）。
- 前端收到后会执行 React Query `invalidateQueries(["getSpaceSidebarTree", spaceId])`，左侧频道列表自动刷新。

## 数据规范化（防脏数据）

为避免拖拽/增删导致 tree 出现异常结构，本次增加了 `normalizeSidebarTree`：

- 固定输出 v2 结构（`schemaVersion=2`），并确保分类字段完整（`categoryId/name/items`）
- 过滤不存在的 room/doc
- 统一 `nodeId` 格式（`room:{roomId}` / `doc:{docId}`）并去重

同时，`parseSidebarTree` 支持自动将 v1（固定 `TEXT/VOICE/DOC`）迁移到 v2：旧的 `TEXT+VOICE` 会合并到一个默认分类（例如“频道”），`DOC` 会迁移到“文档”分类（非 KP 仍会被隐藏）。

保存前会再次执行规范化，避免把脏数据写入后端。

## 相关文件

- 频道树模型与规范化：`app/components/chat/room/sidebarTree.ts`
- 频道列表 UI（v2 分类、直接拖拽、分类编辑）：`app/components/chat/room/chatRoomListPanel.tsx`
- 保存前规范化：`app/components/chat/chatPage.tsx`
