# 任务清单: 聊天室文本导入（txt → 多条消息）

Ŀ¼: `helloagents/plan/202601201337_chat_import_text/`

---

## 1. chat
- [√] 1.1 在 `app/components/chat/utils/importChatText.ts` 实现文本解析（每行提取角色名与内容），验证 why.md#核心场景
- [√] 1.2 在 `app/components/chat/window/importChatMessagesWindow.tsx` 实现导入弹窗：文件/粘贴、角色映射、进度显示，验证 why.md#核心场景
- [√] 1.3 在 `app/components/chat/input/chatToolbar.tsx` 增加“导入文本”入口并联通到房间弹窗，验证 why.md#核心场景
- [√] 1.4 在 `app/components/chat/room/roomWindow.tsx` 实现导入发送逻辑（顺序发送、thread 兼容、清理插入/回复状态），验证 why.md#核心场景

## 2. 安全检查
- [√] 2.1 执行安全检查（输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/chat.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

## 4. 测试
- [√] 4.1 在 `app/components/chat/utils/importChatText.test.ts` 补充/运行单元测试，验证解析边界与无效行统计
