# task

- [√] 修复：复制到空间侧边栏改为创建 `space_doc`（`POST /space/doc`）
- [√] 修复：将 snapshot 写入 `entityType=space_doc`，并写入 sidebarTree `cat:docs`
- [√] 修复：跳转改为 `/chat/:spaceId/doc/:docId(number)`，确保与现有路由一致
- [√] 验证：已运行 `pnpm typecheck`（当前仓库仍有 2 个既有类型错误，与本次改动无关）
