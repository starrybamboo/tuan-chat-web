# 任务清单: 聊天音频取消 60s 截断并减少预加载

目录: `helloagents/history/2026-01/202601290000_chat-audio-no-truncate/`

---

## 1. 聊天音频发送
- [√] 1.1 取消聊天音频强制 `60s` 截断（转码不再默认传 `-t 60`）
- [√] 1.2 `soundMessage.second` 使用实际解析时长（不再 clamp 到 60）

## 2. 请求次数优化
- [-] 2.1 聊天音频消息播放器 `preload=none` 方案已回退（保留 `preload=metadata`）

## 3. 文档同步
- [√] 3.1 更新 `helloagents/wiki/modules/OSS.md`：说明 `maxDuration<=0` 表示不截断
