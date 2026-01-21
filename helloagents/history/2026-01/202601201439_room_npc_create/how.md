# 技术设计: 房间角色列表 NPC+ 直接创建 NPC

## 技术方案

- 新增 `CreateNpcRoleWindow`：
  - “快速创建”表单：调用 `useCreateRoleMutation` 创建角色
  - 调用 `useAddSpaceRoleMutation` 将角色加入空间 NPC 库
  - 调用 `useAddRoomRoleMutation` 以 `type=1` 将角色加入房间
  - 下方保留“从 NPC 库导入”列表：展示空间 NPC 库中未加入当前房间的角色，点击即可加入房间（同样使用 `type=1`）
- 修复/收敛 hooks：
  - `useAddSpaceRoleMutation` 改为真实调用后端 `POST /space/module/role`
  - `useAddRoomRoleMutation` 增加对 `roomModuleRole` 的缓存失效，确保 NPC 列表及时刷新
- 修复 Space 侧“添加 NPC”调用参数形状：`SpaceRole` 使用 `roleId` 而不是 `roleIdList`

## 安全与性能

- **安全:** 创建与添加均走现有鉴权（仅 KP 可执行空间 NPC 库相关操作）。
- **性能:** 操作次数为 3 次请求（创建角色/加入空间/加入房间），可接受；缓存失效范围收敛到相关 key。

## 测试与部署

- `pnpm typecheck`
- `pnpm lint`

