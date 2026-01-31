# 技术设计: 音频流式播放与进度条

## 技术方案
### 核心技术
- React + TypeScript
- HTML5 Audio（Media Element 流式播放）
- `react-h5-audio-player`（进度条与拖动控件）

### 实现要点
- `AudioMessage` 使用 `react-h5-audio-player` 替换 WaveSurfer：保留播放/暂停、进度条与时间显示，禁用波形渲染。
- `audioProps` 设定 `preload="metadata"` 与 `crossOrigin="anonymous"`，保证流式加载与跨域播放一致性。
- 通过组件配置与局部样式覆盖，使播放器外观与现有聊天气泡风格一致。
- `bgmPlayer` 调整为 `preload="metadata"` 的流式配置，保持现有 WebAudio 增益控制与暂停/续播逻辑。
- 删除 `wavesurfer.js` 依赖与相关逻辑，减少资源占用。

## 架构设计
无新增架构变更。

## API设计
无接口变更。

## 数据模型
无数据结构变更。

## 安全与性能
- **安全:** 继续使用已有的音频 URL 处理流程，不新增鉴权或密钥持久化。
- **性能:** 移除 WaveSurfer 解码成本；使用 `preload="metadata"` 避免全量预取，支持边播边加载。

## 测试与部署
- **测试:** 手动验证音频消息播放、进度条拖动、BGM 播放与暂停；在弱网/大文件下观察是否可边播边加载。
- **部署:** 前端依赖更新后正常构建发布；无需后端改动。
