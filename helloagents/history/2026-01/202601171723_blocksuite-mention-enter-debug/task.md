# 任务清单: Blocksuite @ 提及 Enter 链路调试增强

目录: `helloagents/plan/202601171723_blocksuite-mention-enter-debug/`

---

## 1. frame / Enter 调试信息增强
- [√] 1.1 在 `app/routes/blocksuiteFrame.tsx` 的 `keydown @/Enter/Escape` debug-log 中补充 `document.activeElement` 摘要，帮助定位“键盘确认”时焦点所在的 DOM/组件

## 2. 宿主侧 / Enter 诊断
- [√] 2.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`（iframe host）中：收到 frame `keydown Enter` 且仍在 `@` 调试窗口内时，输出宿主 `activeElement` 与若干 portal/menu 探针计数（`[BlocksuiteHostDebug] keydown Enter`）

## 3. 测试
- [-] 3.1 在空间描述里输入 `@` 后直接按回车选择候选项，收集 `[BlocksuiteFrameDebug] keydown Enter payload.active` 与 `[BlocksuiteHostDebug] keydown Enter probes`，用于锁定真正的插入链路

