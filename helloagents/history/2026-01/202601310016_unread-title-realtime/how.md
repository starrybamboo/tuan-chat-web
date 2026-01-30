# 技术设计: 未读计数标题实时化

## 技术方案
### 核心技术
- React Hooks
- React Query（会话缓存与读位更新）

### 实现要点
- 在 `chatFrame` 中新增 effect：当 `unreadMessageNumber` 变化且当前在底部时，触发 `updateLastReadSyncId`。
- 保持原有“滚动到底/底部状态变化”更新逻辑不变。
- 依赖 `updateLastReadSyncId` 的去重判断，避免重复提交。

## 架构设计
无。

## API 设计
无。

## 数据模型
无。

## 安全与性能
- **安全:** 无新增风险。
- **性能:** 仅在 unread 变化时触发，影响可忽略。

## 测试与部署
- **手动:** 进入聊天页，若位于底部，标签未读应自动清零；新消息到达后再增长。
- **类型检查:** 运行 `pnpm typecheck`。
