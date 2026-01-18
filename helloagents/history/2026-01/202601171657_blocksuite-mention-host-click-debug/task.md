# 任务清单: Blocksuite @ 提及宿主点击链路调试

目录: `helloagents/plan/202601171657_blocksuite-mention-host-click-debug/`

---

## 1. 宿主侧点击事件日志（iframe 外 portal 诊断）
- [√] 1.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`（iframe host）中：收到 frame 的 `keydown @` 后，开启短窗口（5s/限量）捕获宿主 `pointerdown/click` 并输出 path 摘要到控制台（`[BlocksuiteHostDebug]`）

## 2. 测试
- [-] 2.1 在空间描述里输入 `@` 并点击候选项，确认控制台出现 `[BlocksuiteHostDebug]`，用于定位候选项 DOM/组件来源

