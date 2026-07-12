# VoiceBox TTS 集成

团剧共创的 WebGAL 实时渲染通过 VoiceBox REST API 生成对话配音。

## 运行约定

- VoiceBox 地址：`http://127.0.0.1:17493`
- 引擎：`qwen_custom_voice`
- 模型：`0.6B`
- 默认音色：`Serena`
- 默认语言：`zh`
- 音频格式：WAV

VoiceBox 会按选中的预设音色自动创建 `TuanChat CustomVoice <voiceId>` Profile。团剧共创提交异步生成任务，轮询完成状态，再下载音频并上传到实时工程的 `game/vocal` 目录。

## REST 调用

1. `GET /profiles` 查询已存在的预设 Profile。
2. `POST /profiles` 创建缺失的 Qwen CustomVoice Profile。
3. `POST /generate` 创建 0.6B 配音任务。
4. `GET /history/{generationId}` 轮询任务状态。
5. `GET /audio/{generationId}` 下载 WAV 文件。

## 配置

空间 WebGAL 实时渲染设置会保存以下字段：

- `ttsApiUrl`
- `ttsVoiceId`
- `ttsInstruct`

## 官方后端启动

VoiceBox 上游源码保持原样。Windows 本地运行使用项目自带的 `justfile`：

```powershell
cd D:\A_collection\voicebox
just setup
just dev-backend
```

部署域名调用本机服务时，在同一终端中配置允许来源后启动：

```powershell
$env:VOICEBOX_CORS_ORIGINS="https://你的团剧共创域名"
just dev-backend
```

多个来源使用英文逗号分隔。VoiceBox 默认允许 `localhost:5173`、`127.0.0.1:5173`、VoiceBox 自身和 Tauri 来源。

## 实时渲染行为

- 普通角色文本在启用 TTS 后自动生成配音。
- 旁白、开场文字、语音消息和非文本消息跳过自动生成。
- 缓存键包含 API 地址、音色、语言、风格指令和文本。
- 生成结果以 `voicebox_<hash>.wav` 上传到当前实时工程的 `game/vocal`。
- 强制重新生成会跳过现有 WAV 缓存。
- Profile 在 VoiceBox 中被删除后，客户端会清理本地缓存、重新创建并重试一次。
- 单条配音失败会记录警告，文本渲染继续执行。

## 浏览器访问

线上 Web 页面访问本机 `127.0.0.1:17493` 时，需要同时满足 VoiceBox CORS 放行和浏览器本地网络访问策略。首次访问出现本地网络授权提示时，需要允许该站点访问本机服务。
