# 任务清单: Blocksuite 空间描述 @ 提及重复插入修复（插入链路）

Ŀ¼: `helloagents/plan/202601171745_blocksuite-mention-insert-fix/`

---

## 1. 修复插入与关闭弹窗
- [√] 1.1 将成员提及插入改为使用 `inlineEditor`（与上游 linked-doc 插入一致），先 `abort()` 清理 `@query` 再插入 mention，避免弹窗不关闭/残留 query
- [√] 1.2 Ϊ linked-doc popover 的 doc action 与 member mention action 增加短窗口去重（避免同一次确认触发多次 action）

## 2. 测试
- [-] 2.1 在空间描述中：输入 `@`，鼠标点击候选项应只插入一次并关闭弹窗
- [-] 2.2 在空间描述中：输入 `@`，回车选择候选项应只插入一次并关闭弹窗

