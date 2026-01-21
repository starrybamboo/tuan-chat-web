# 任务清单: 房间角色列表 NPC+ 直接创建 NPC

目录: `helloagents/history/2026-01/202601201439_room_npc_create/`

---

## 1. chat
- [√] 1.1 在 `app/components/chat/window/createNpcRoleWindow.tsx` 实现创建 NPC（创建角色→加入空间NPC库→加入房间）
- [√] 1.2 在 `app/components/chat/room/drawers/roomRoleList.tsx` 将 `NPC+` 入口改为打开创建窗口
- [√] 1.3 修复 `app/components/chat/space/drawers/spaceDetailPanel.tsx` 添加空间 NPC 的请求字段（`roleId`）

## 2. hooks
- [√] 2.1 修复 `api/hooks/chatQueryHooks.tsx` 的 `useAddSpaceRoleMutation`（调用真实接口并刷新缓存）
- [√] 2.2 优化 `api/hooks/chatQueryHooks.tsx` 的 `useAddRoomRoleMutation`（刷新 `roomModuleRole` 缓存）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/chat.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

## 4. 测试
- [√] 4.1 运行 `pnpm typecheck` 与 `pnpm lint`

