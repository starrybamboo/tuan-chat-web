## 1. 好友请求乐观更新（共享层 + 桌面端）

- [x] 1.1 在 `packages/tuanchat-query/src/friends.ts` 的 `useAcceptFriendRequestMutation` 中添加 `onMutate` 乐观移除已处理请求，`onError` 回滚
- [x] 1.2 在 `packages/tuanchat-query/src/friends.ts` 的 `useRejectFriendRequestMutation` 中添加 `onMutate` 乐观移除已处理请求，`onError` 回滚
- [x] 1.3 在 `api/hooks/friendQueryHooks.tsx` 的 `useAcceptFriendRequestMutation` 中添加同样的乐观更新逻辑
- [x] 1.4 在 `api/hooks/friendQueryHooks.tsx` 的 `useRejectFriendRequestMutation` 中添加同样的乐观更新逻辑
- [x] 1.5 验证桌面端待处理列表在接受/拒绝后立即移除对应请求项

## 2. 移动端 AddFriendTab 完善

- [x] 2.1 搜索结果区域增加用户头像和用户名展示（使用 expo-image + avatarThumbUrl）
- [x] 2.2 根据 friendCheck 状态动态控制 UI：已是好友时隐藏发送按钮，已拉黑时显示提示文字，待处理时按钮显示"已申请"并禁用
- [x] 2.3 发送成功后重置 resolvedTargetUserId 和 friendStatus 状态
- [x] 2.4 验证移动端添加好友完整流程：搜索 → 查看状态 → 填写验证信息 → 发送

## 3. 移动端 AllFriendsTab 拉黑功能

- [x] 3.1 在 `FriendsManagementView.tsx` 中引入 `useBlockFriendMutation` 并传递给 AllFriendsTab
- [x] 3.2 在 `AllFriendsTab.tsx` 中为每个好友行添加拉黑按钮，点击后弹出 Alert 确认
- [x] 3.3 拉黑成功后显示提示，失败时显示错误信息
- [x] 3.4 拉黑操作进行中时禁用按钮防止重复请求

## 4. 验证与收尾

- [x] 4.1 运行 TypeScript 类型检查确保无编译错误
- [ ] 4.2 在移动端模拟器中测试好友管理全流程（添加、接受、拒绝、拉黑）
- [ ] 4.3 在桌面端浏览器中验证好友请求处理后列表即时更新
