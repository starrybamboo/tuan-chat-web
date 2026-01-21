# 轻量迭代：房间角色可删除 + 角色页隐藏 NPC

任务清单：
- [√] 允许删除房间 NPC：房间角色列表中 NPC 也可被踢出（权限同普通角色）
- [√] 删除后刷新：删除房间角色后同时刷新 roomRole 与 roomModuleRole
- [√] 角色页隐藏 NPC：/role（角色 Tab）不展示 `type=2` 的 NPC
- [√] “导入我的角色”隐藏 NPC：房间导入角色弹窗过滤 `type=2`
- [√] 更新知识库：Chat/Role 相关说明（如有）
- [√] 验证：`pnpm run typecheck` 通过
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
