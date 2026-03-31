# 音频消息自动播放回归清单

## 目标
- 自动播放只响应音频用途 annotation 从无到有。
- WebSocket 只允许当前正在查看的房间自动播放。
- 首发带 `BGM` 的音频消息会先尝试播放，并在 fallback/可见播放器之间平滑接管。
- 自动播放事件只有在真实开始播放后才会被消费；若浏览器拒绝播放或可见播放器未起播，pending 会保留，等待 `ready` 或下一次用户手势重试。
- 编辑消息 annotation 时，`soundMessage.purpose` 与 annotation 保持一致。

## 关键自动化用例
- `audioMessageAutoPlayPolicy.test.ts`
  - 首发带 `sys:bgm` 时触发自动播放。
  - 更新新增 `sys:bgm` 时触发自动播放。
  - 删除 `sys:bgm` 不触发自动播放。
- `audioMessageAutoPlayRuntime.test.ts`
  - WS 未入队时不 seed BGM 播放。
  - WS 入队成功时才 seed BGM 播放。
  - 本地发送音效只入队，不触发 BGM seed。
- `audioMessagePurpose.test.ts`
  - annotation 优先于残留 payload/content tag。
  - 删除 BGM annotation 时同步清除 payload purpose。
  - 旧消息无音频 annotation 时，编辑无关注释不误清 payload purpose。
- `audioMessageBgmCoordinator.test.ts`
  - fallback BGM 可在可见播放器真正开始播放后接管。
  - 可见播放器未真正开始播放时保留 fallback BGM。
- `audioMessageAutoPlay.e2e.test.ts`
  - 非当前房间的 WS BGM 更新不会 seed fallback。
  - 首发本地发送 BGM 会先启动 fallback，再在可见控制器挂载后接管。
  - 当前房间的 WS BGM 首次出现时会触发浏览器侧自动播放链路。
  - 可见播放器首次接管失败时不会提前消费 pending，后续用户手势仍可自动重试接管。
- `useChatMessageSubmit.test.ts`
  - 首发带 BGM annotation 的音频消息会触发本地自动播放 helper。

## 建议命令
```bash
pnpm test -- app/components/chat/infra/audioMessage/audioMessageAutoPlayPolicy.test.ts app/components/chat/infra/audioMessage/audioMessageAutoPlayRuntime.test.ts app/components/chat/infra/audioMessage/audioMessagePurpose.test.ts app/components/chat/infra/audioMessage/audioMessageBgmCoordinator.test.ts app/components/chat/room/useChatMessageSubmit.test.ts app/components/chat/message/preview/getMessagePreviewText.test.ts
pnpm test:e2e -- app/components/chat/infra/audioMessage/audioMessageAutoPlay.e2e.test.ts
pnpm test
```

## 手工验证建议
- 当前房间首发上传音频，预览条带 `BGM`，发送后应立即开始播放。
- 若浏览器首次自动播放被拦截，消息仍应保留自动播放资格；下一次点击页面或按键后应自动重试。
- 非当前房间收到新的 BGM 消息时，本房间不应被打断。
- 现有 BGM 消息删除 `BGM` annotation 后，不应再被当作 BGM 渲染或自动播放。
