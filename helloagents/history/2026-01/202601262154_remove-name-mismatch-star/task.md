# 任务清单: 移除聊天发言人名不一致星号提示

目录: `helloagents/plan/202601262154_remove-name-mismatch-star/`

---

## 1. 消息气泡：发言人名展示
- [√] 1.1 在 `app/components/chat/message/chatBubble.tsx` 中移除“customRoleName 与角色名不一致时展示 *”的提示逻辑

## 2. 文档更新
- [√] 2.1 更新 `helloagents/wiki/modules/chat.md`：补充发言人名展示规则（不再展示 * 标记）
- [√] 2.2 更新 `helloagents/CHANGELOG.md`：记录本次变更

## 3. 测试
- [X] 3.1 执行 TypeScript/构建校验，确保改动不引入编译错误
  - 说明：`pnpm typecheck` 在当前 `dev-jxc` 基线即存在失败（与本次改动无关）
