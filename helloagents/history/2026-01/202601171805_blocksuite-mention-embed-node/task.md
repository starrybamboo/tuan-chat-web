# 任务清单: Blocksuite @ 提及重复渲染修复（embed 节点插入）

Ŀ¼: `helloagents/plan/202601171805_blocksuite-mention-embed-node/`

---

## 1. 根因修复：按 Blocksuite 规范插入 mention embed 节点
- [√] 1.1 在 `createEmbeddedAffineEditor.client.ts` 中，成员提及插入改为写入 `ZERO_WIDTH_FOR_EMBED_NODE` + `mention.member` 属性，而不是写入 `@displayName` 文本
- [√] 1.2 插入后补一个普通空格，并把光标移动到空格之后，保证继续输入体验

## 2. 测试
- [-] 2.1 空间/房间资料描述：输入 `@` 选择候选项，页面只显示 1 个提及（不再出现 `@鸠 @鸠 ...` 重复渲染）
- [-] 2.2 验证弹窗关闭：选择后 popover 关闭且不会残留 `@query`

