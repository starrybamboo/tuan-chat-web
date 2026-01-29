# 任务清单: 音频流式播放与进度条

目录: `helloagents/plan/202601272208_audio-stream/`

---

## 1. 聊天音频消息组件
- [√] 1.1 在 `app/components/chat/message/media/AudioMessage.tsx` 中用 `react-h5-audio-player` 替换 WaveSurfer，实现进度条与拖动定位，验证 why.md#需求-音频消息流式播放-场景-立即播放与拖动进度
- [√] 1.2 如需样式覆盖，在 `app/components/chat/message/media/audioMessage.css`（或现有样式文件）中调整播放器样式，验证 why.md#需求-音频消息流式播放-场景-立即播放与拖动进度
- [√] 1.3 在 `app/components/common/AudioPlayer.tsx`、`app/components/resource/utils/AudioWavePlayer.tsx`、`app/components/Role/RoleInfoCard/AudioPlayer.tsx` 中替换 WaveSurfer，统一为流式播放与进度条控件，验证 why.md#需求-音频消息流式播放-场景-立即播放与拖动进度

## 2. BGM 播放器流式配置
- [√] 2.1 在 `app/components/chat/infra/bgm/bgmPlayer.ts` 中调整 `preload` 与加载策略以支持流式播放，验证 why.md#需求-BGM-流式播放-场景-房间收到-BGM

## 3. 依赖与清理
- [√] 3.1 在 `package.json` 与 `pnpm-lock.yaml` 中新增 `react-h5-audio-player` 并移除 `wavesurfer.js`，验证 why.md#需求-音频消息流式播放-场景-立即播放与拖动进度

## 4. 安全检查
- [√] 4.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 5. 文档更新
- [√] 5.1 更新 `helloagents/wiki/modules/chat.md` 记录音频消息播放器变更
- [√] 5.2 更新 `helloagents/CHANGELOG.md`

## 6. 测试
- [X] 6.1 手动验证：音频消息可边播边加载、进度条可拖动、BGM 可播放且不中断；在弱网/大文件下观察是否仍可播放
  > 备注: 未执行手动验证（需要浏览器与弱网环境）
