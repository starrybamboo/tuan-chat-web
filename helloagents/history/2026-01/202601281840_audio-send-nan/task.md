# 任务清单: 修复音频消息发送 NaN

Ŀ¼: `helloagents/plan/202601281840_audio-send-nan/`

---

## 1. Chat 音频消息发送
- [√] 1.1 修复发送语音时 `soundMessage.second` 可能为 NaN/非法数导致发送失败的问题（在 `app/components/chat/room/roomWindow.tsx` 对时长做兜底与 clamp）

## 2. 文档与变更记录
- [√] 2.1 更新 `helloagents/wiki/modules/chat.md`（补充音频发送 second 字段兜底说明）
- [√] 2.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 3. 验证
- [√] 3.1 运行定向 ESLint：`app/components/chat/room/roomWindow.tsx`
