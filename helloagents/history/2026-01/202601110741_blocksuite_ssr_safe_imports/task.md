# task - Blocksuite SSR 安全导入修复

## 任务清单

- [√] 将 `deleteSpaceDoc` 改为 SSR-safe（函数内动态 import + 环境守卫）
- [√] 更新 `chatRoomListPanel.tsx` 的调用逻辑以适配异步删除
- [√] 全局扫描：确认无其他 SSR 路径静态导入 Blocksuite 运行时依赖
- [√] 本地验证：`pnpm dev` 启动无 `document is not defined`
- [√] 同步知识库与变更记录（`helloagents/wiki/modules/app.md`、`helloagents/CHANGELOG.md`）
- [√] 迁移方案包到 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
