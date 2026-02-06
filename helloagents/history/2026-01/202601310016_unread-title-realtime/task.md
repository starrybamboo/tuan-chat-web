# 任务清单: 未读计数标题实时化

Ŀ¼: `helloagents/plan/202601310016_unread-title-realtime/`

---

## 1. 未读读位同步
- [x] 1.1 在 `app/components/chat/chatFrame.tsx` 中补充监听 `unreadMessageNumber` 的对齐逻辑，验证 why.md#需求-未读计数在进入聊天页对齐实时状态-场景-会话数据晚于页面渲染加载
- [-] 1.2 若需改动 `api/useWebSocket.tsx` 的读位更新保护逻辑则实现，否则标记为[-]，验证 why.md#需求-未读计数在进入聊天页对齐实时状态
  > 备注: 当前 `updateLastReadSyncId` 已具备去重与保护逻辑，无需修改。

## 2. 安全检查
- [x] 2.1 执行安全检查（输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 测试
- [x] 3.1 运行 `pnpm typecheck` 验证类型检查通过
