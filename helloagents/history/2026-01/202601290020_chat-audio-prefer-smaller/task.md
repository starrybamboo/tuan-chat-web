# 任务清单: 聊天音频转码尽量更小（否则阻止上传）

目录: `helloagents/history/2026-01/202601290020_chat-audio-prefer-smaller/`

---

## 1. 体积策略
- [√] 1.1 将默认 Opus 目标码率下调为 `64kbps`
- [√] 1.2 聊天音频上传启用 `preferSmallerThanBytes`：对 `>=48KB` 的输入，若多档预设仍无法转码更小则阻止上传

## 2. 文档同步
- [√] 2.1 更新 `helloagents/wiki/modules/OSS.md`：记录多档预设与失败策略
- [√] 2.2 更新 `helloagents/CHANGELOG.md`

