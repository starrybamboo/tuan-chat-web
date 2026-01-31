# 轻量迭代：创建 NPC 复用角色创建（仅类型不同）

任务清单：
- [√] 调整创建 NPC 链路：创建时直接创建 `type=2` 并绑定 `spaceId`
- [√] 移除不必要的 `addSpaceRole` 步骤（依赖 spaceId 绑定即可进入 NPC 库）
- [√] 更新前端 OpenAPI 生成模型：`RoleCreateRequest`/`UserRole` 增加 `spaceId` 字段
- [√] 同步知识库：`helloagents/wiki/modules/chat.md`（如有相关描述）
- [√] 验证：前端 typecheck/build 通过（至少 typecheck）
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
