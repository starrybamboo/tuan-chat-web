# 任务清单: 聊天导入保留原发言人名

目录: `helloagents/plan/202601232052_chat_import_preserve_speaker_name/`

---

## 1. 聊天导入发送逻辑
- [√] 1.1 在 `app/components/chat/room/roomWindow.tsx` 中传递 `speakerName` 并写入 `customRoleName`，验证 why.md#需求-导入后保留原发言人名-场景-导入文本并映射角色

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/chat.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

## 4. 测试
- [-] 4.1 进行手工验证: 导入含多发言人/骰娘/旁白文本，确认显示名保持原文本并正常发送
  > 备注: 本次未执行手工验证
