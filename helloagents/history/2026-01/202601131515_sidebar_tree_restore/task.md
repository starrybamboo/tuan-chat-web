# 任务清单（sidebarTree 功能恢复与交互对齐）

- [√] 修复“新增分类”后新分类闪开闪关/无法展开
- [√] 分类增删改/拖拽后写入 `/space/sidebarTree`
- [√] 修复“重置默认”不触发后端请求（重建时包含 doc metas）
- [√] 去掉“创建房间”入口，改为分类标题右侧“+”弹窗选择创建房间/文档（样式对齐邀请链接区域）
- [√] 文档统一在 Chat 布局内打开：`/chat/:spaceId/doc/:docId`；`/doc/:spaceId/:docId` 路由改为跳转
- [√] 本地验证：`pnpm typecheck`
- [√] 迁移方案包至 `helloagents/history/` 并更新索引
