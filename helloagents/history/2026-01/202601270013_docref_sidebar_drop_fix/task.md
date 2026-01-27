# 任务清单: 修复文档拖拽到侧边栏无响应

目录: `helloagents/history/2026-01/202601270013_docref_sidebar_drop_fix/`

---

## 1. DocRef 拖拽工具（兼容性）
- [√] 1.1 在 `app/components/chat/utils/docRef.ts` 中补齐 `text/plain` 兜底写入（仅在为空时写入），并增强 `isDocRefDrag` 识别逻辑，验证 why.md#需求:-文档拖拽复制到空间侧边栏-场景:-KP-拖拽复制成功

## 2. SidebarTree 拖拽接收（可触发 + 有反馈）
- [√] 2.1 在 `app/components/chat/room/chatRoomListPanel.tsx` 中调整 dragover/drop：确保 DocRef dragover 能 `preventDefault`，drop 能触发并调用 `handleDropDocRefToCategory`，验证 why.md#需求:-文档拖拽复制到空间侧边栏-场景:-KP-拖拽复制成功
- [√] 2.2 在 `app/components/chat/room/chatRoomListPanel.tsx` 中放开非 KP 的 drop 进入（由 `handleDropDocRefToCategory` 负责 toast 权限提示），验证 why.md#需求:-文档拖拽复制到空间侧边栏-场景:-非-KP-拖拽得到明确反馈

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 权限控制、敏感信息处理、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/chat.md`，补充“文档卡片拖拽到侧边栏”的行为与限制说明
- [√] 4.2 更新 `helloagents/CHANGELOG.md` 记录本次修复

## 5. 测试
- [?] 5.1 手动验证：KP/非KP拖拽、Network/Toast/侧边栏新增、侧边栏内部拖拽排序回归
