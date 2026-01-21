# 轻量迭代：获取用户角色改用 /role/user/type

任务清单：
- [√] 前端获取用户角色列表改用 `GET /role/user/type`（分别请求 type=0 与 type=1 后合并），避免取回 NPC(type=2)
- [√] `useGetInfiniteUserRolesQuery` 改为基于合并结果做前端分页（保持现有无限滚动行为）
- [√] 保持 queryKey 不变，避免影响缓存调用方
- [√] 更新知识库（如需）：说明角色列表获取不再依赖前端过滤 NPC
- [√] 验证：`pnpm run typecheck` 通过
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
