# 变更提案: 房间角色列表 NPC+ 直接创建 NPC

## 需求背景

当前“房间角色列表”里存在 `角色+` 与 `NPC+` 两个入口，但 `NPC+` 实际行为是“从空间 NPC 库导入”。用户期望在房间内更快捷地创建 NPC：点击 `NPC+` 即进入创建流程，并自动加入当前房间。

## 变更内容

1. `NPC+` 弹窗改为“创建 NPC”窗口：输入名称/简介即可创建，并自动加入房间。
2. 创建后的 NPC 会同步写入“空间 NPC 库”，便于后续复用。
3. 兼容保留“从 NPC 库导入到房间”的能力，作为创建窗口的次要入口。

## 影响范围

- **模块:** `chat`
- **文件:**
  - `app/components/chat/room/drawers/roomRoleList.tsx`
  - `app/components/chat/window/createNpcRoleWindow.tsx`
  - `app/components/chat/space/drawers/spaceDetailPanel.tsx`
  - `api/hooks/chatQueryHooks.tsx`
- **API:** 复用既有接口
  - `POST /role` 创建角色
  - `POST /space/module/role` 将角色加入空间 NPC 库
  - `POST /room/role/` 将角色以 `type=1` 加入房间
- **数据:** 无新增数据结构

## 核心场景

### 需求: 点击 NPC+ 创建并加入房间
**模块:** chat

#### 场景: 一键创建
- KP 在房间角色列表点击 `NPC+`
- 输入 NPC 名称与简介
- 系统创建角色 → 加入空间 NPC 库 → 以 NPC 身份加入当前房间
- 房间 NPC 列表刷新并可立即使用

