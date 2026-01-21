# 轻量迭代：空间跑团设置空白修复

> 目标：在空间抽屉面板打开“跑团设置”时，正确展示空间规则与空间骰娘配置。

## 任务清单

- [√] 定位原因：SpaceDetailPanel 未渲染 `trpg` tab
- [√] 修复渲染：为 `resolvedTab === "trpg"` 挂载 `SpaceTrpgSettingWindow`
- [√] 验证：`pnpm typecheck` 通过
- [√] 同步知识库：更新变更记录与模块文档
- [√] 迁移方案包：移动至 `helloagents/history/YYYY-MM/` 并更新索引
