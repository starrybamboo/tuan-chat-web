## Context

好友系统分为 Web 桌面端（`app/components/privateChat/FriendsPage.tsx`）和移动端（`apps/mobile/src/features/friends/`）。两端共享 `@tuanchat/query` 包中的 React Query hooks，通过依赖注入 `FriendClient` 实现平台无关的数据层。

当前问题：
1. 好友请求处理后（接受/拒绝），`invalidateQueries` 触发重新获取，但 30 秒 staleTime 内 UI 不会立即反映变化，已处理的请求仍残留在列表中
2. 移动端 AddFriendTab 已有基本框架但缺少用户信息展示（头像、用户名）
3. 移动端 AllFriendsTab 只有删除操作，缺少拉黑功能

## Goals / Non-Goals

**Goals:**
- 好友请求处理后立即从待处理列表中消失（乐观更新）
- 移动端 AddFriendTab 搜索结果展示用户头像和详细信息
- 移动端 AllFriendsTab 增加拉黑操作，带确认弹窗
- 移动端整体交互体验与桌面端对齐（操作反馈、空状态）

**Non-Goals:**
- 不重构共享 query 包的整体架构
- 不添加实时推送（WebSocket）通知好友请求
- 不修改后端 API 接口
- 不处理好友分组/备注功能

## Decisions

### 1. 好友请求处理后的缓存策略：乐观更新 + invalidate

**选择**: 在 `onMutate` 中乐观移除已处理的请求项，同时在 `onSuccess` 中 invalidate 确保最终一致。

**理由**: 纯 invalidate 受 staleTime 影响，用户体验差。乐观更新让 UI 即时响应，失败时通过 `onError` 回滚。这是 React Query 推荐的模式。

**实现位置**: `packages/tuanchat-query/src/friends.ts` 中的 `useAcceptFriendRequestMutation` 和 `useRejectFriendRequestMutation`，同时桌面端 `api/hooks/friendQueryHooks.tsx` 也需同步修改。

### 2. 移动端 AddFriendTab 改进方向

**选择**: 在查询结果区域增加用户头像、用户名展示，并根据 friendCheck 状态动态控制"发送申请"按钮的可用性（已是好友/已拉黑时禁用）。

**理由**: 桌面端已有完整的搜索结果卡片展示，移动端应保持信息一致性，只是布局适配移动屏幕。

### 3. 移动端拉黑功能的交互模式

**选择**: 在好友列表项中增加长按菜单或右侧操作按钮，点击后弹出 Alert 确认。

**理由**: 移动端空间有限，拉黑是低频但高风险操作，需要确认步骤防止误触。与桌面端的 `window.confirm` 对应。

## Risks / Trade-offs

- [乐观更新回滚] 如果网络请求失败，需要正确恢复之前的列表状态 → 在 `onMutate` 中保存 snapshot，`onError` 中恢复
- [移动端 API 调用方式] AddFriendTab 直接调用 `mobileApiClient.userController.getUserInfoByUsername`，绕过了 React Query → 可接受，因为这是一次性搜索操作，不需要缓存
- [共享包修改影响范围] 修改 `@tuanchat/query` 中的 mutation hooks 会同时影响 Web 和 Mobile → 这正是期望的行为，两端都需要乐观更新
