# 任务清单: 导入对话弹窗去嵌套

目录: `helloagents/plan/202601272011_import-chat-style/`

---

## 1. 导入弹窗 UI
- [√] 1.1 在 `app/components/chat/window/importChatMessagesWindow.tsx` 中调整根容器为单层布局（移除内部卡片样式与固定尺寸），验证 why.md#需求-消息导入弹窗样式修复-场景-长内容可见

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/chat.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

## 4. 测试
- [-] 4.1 本地打开导入弹窗进行手动验证：长内容可滚动到底部、无双层滚动
  > 备注: 当前环境未运行应用，未执行手动验证
