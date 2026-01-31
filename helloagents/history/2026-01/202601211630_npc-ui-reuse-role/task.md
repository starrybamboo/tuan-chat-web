# 轻量迭代：NPC 交互全面复用角色体系

任务清单：
- [√] NPC 创建弹窗复用角色创建流程（RoleCreationFlow），并在创建后自动加入房间
- [√] 角色头像点击弹窗复用角色页面详情（CharacterDetail），并保留房间内“踢出角色”能力
- [√] 适配创建参数：支持创建时透传 `type` / `spaceId`
- [√] 更新知识库：Chat 模块 NPC 创建/详情弹窗描述
- [√] 验证：前端 typecheck 通过（至少 `pnpm run typecheck`）
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
