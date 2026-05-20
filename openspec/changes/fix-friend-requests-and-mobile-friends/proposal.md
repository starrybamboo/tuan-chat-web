## Why

好友请求处理后（接受/拒绝）仍然残留在待处理列表中，需要在处理后立即从列表移除。同时移动端好友系统功能不完整——添加好友 Tab 未实现搜索和发送逻辑，缺少拉黑功能，整体 UI/交互与桌面端存在差距。

## What Changes

- 修复好友请求处理后列表不清除的问题：接受/拒绝后从本地缓存中移除已处理的请求，而非等待下次查询刷新
- 移动端 AddFriendTab 完善：实现用户搜索（按 ID/用户名）、好友关系检查、验证信息填写、发送好友申请的完整流程
- 移动端 AllFriendsTab 增加拉黑功能：在好友列表项中添加拉黑操作按钮
- 移动端 UI/交互对齐桌面端：搜索好友、操作反馈（成功/失败提示）、空状态优化

## Capabilities

### New Capabilities
- `mobile-add-friend`: 移动端添加好友完整流程——搜索用户、检查关系状态、填写验证信息、发送申请
- `mobile-block-friend`: 移动端好友列表中的拉黑功能

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- `apps/mobile/src/features/friends/AddFriendTab.tsx` — 重写，实现完整添加好友流程
- `apps/mobile/src/features/friends/AllFriendsTab.tsx` — 增加拉黑按钮和确认逻辑
- `apps/mobile/src/features/friends/useFriendMutations.ts` — 添加 block mutation
- `apps/mobile/src/features/friends/FriendsManagementView.tsx` — 传递 block 相关 props
- `api/hooks/friendQueryHooks.tsx` 或 `packages/tuanchat-query/src/friends.ts` — 修复请求处理后的缓存更新策略（乐观更新或 mutation onSuccess 中移除已处理项）
- 桌面端 `FriendsPage.tsx` — 同步修复好友请求列表刷新逻辑
