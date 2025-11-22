# TTS 引擎选择功能

## 功能说明

现在在 WebGAL 渲染窗口中添加了 TTS 引擎选择功能,用户可以在 IndexTTS2 和 GPT-SoVITS 之间自由切换。

## 使用方法

### 1. 打开渲染窗口

在聊天页面,进入"渲染设置"窗口。

### 2. 启用语音合成

打开"语音合成"开关 (ON)。

### 3. 选择 TTS 引擎

在"TTS 引擎"区域,选择你想使用的引擎:

#### IndexTTS2 (默认)

- ✅ 无需额外配置
- ✅ 支持情感向量控制 (基于角色头衔自动转换)
- ✅ 8 维情感控制
- 📦 需要本地运行 IndexTTS2 服务 (端口 9000)

#### GPT-SoVITS

- ⚙️ 需要配置以下参数:
  - **API 地址**: GPT-SoVITS 服务地址 (默认 http://127.0.0.1:9880)
  - **参考音频路径**: 服务器端可访问的音频文件路径 (必填)
  - **提示文本**: 参考音频对应的文字内容
  - **提示文本语言**: 参考音频的语言
  - **目标文本语言**: 要生成语音的文本语言

- 📦 需要本地运行 GPT-SoVITS 服务 (端口 9880)

### 4. 配置示例

#### GPT-SoVITS 配置示例

```
API 地址: http://127.0.0.1:9880
参考音频路径: /path/to/your/reference.wav
提示文本: 这是参考音频中说的话
提示文本语言: 中文
目标文本语言: 中文
```

⚠️ **重要**: 参考音频路径必须是 GPT-SoVITS 服务器可以访问到的路径,不能是本地上传的文件路径。

### 5. 上传角色参考音频

为每个需要语音合成的角色上传参考音频文件 (IndexTTS2 使用)。

### 6. 开始渲染

配置完成后,点击"开始渲染"按钮,系统将根据你选择的 TTS 引擎生成语音。

## 技术实现

### 数据流

```
用户选择引擎 
  ↓
RenderProps.ttsEngine
  ↓
ChatRenderer 构建 TTS 选项
  ↓
SceneEditor.uploadVocal
  ↓
createEngine (策略模式)
  ↓
IndexTtsEngine / GptSovitsEngine
  ↓
生成语音
```

### 配置持久化

- 所有配置会自动保存到 `localStorage` 的 `renderProps` 键中
- 下次打开窗口时会自动恢复上次的配置

### 引擎切换

切换引擎不需要重启应用,配置会立即生效:

1. **IndexTTS2 → GPT-SoVITS**: 需要填写 GPT-SoVITS 配置
2. **GPT-SoVITS → IndexTTS2**: 直接切换,无需额外配置

## 注意事项

### IndexTTS2

- ✅ 使用上传的角色参考音频
- ✅ 自动情感控制 (基于角色头衔)
- ⚠️ 需要本地运行 IndexTTS2 API 服务

### GPT-SoVITS

- ⚠️ **参考音频路径必须是服务器端路径**
- ⚠️ 不使用上传的角色参考音频文件
- ⚠️ 所有角色使用相同的参考音频 (配置中指定的)
- ⚠️ 需要本地运行 GPT-SoVITS API 服务
- ⚠️ 确保 GPT-SoVITS 模型已正确加载

### 常见问题

**Q: 为什么 GPT-SoVITS 不能使用上传的角色音频?**

A: GPT-SoVITS 要求音频文件在服务器端可访问,而上传的文件是临时存储在浏览器内存中的 `File` 对象。你需要将参考音频放在 GPT-SoVITS 服务器可访问的路径。

**Q: 能否为不同角色配置不同的 GPT-SoVITS 参考音频?**

A: 当前版本不支持。所有角色会使用相同的 GPT-SoVITS 配置。如果需要为不同角色使用不同音色,建议使用 IndexTTS2 引擎。

**Q: 切换引擎后,之前生成的语音会失效吗?**

A: 不会。已生成的语音文件会被缓存,切换引擎只影响新生成的语音。

## 开发说明

### 相关文件

- `app/components/chat/window/renderWindow.tsx` - UI 界面
- `app/webGAL/chatRenderer.ts` - 引擎选项构建
- `app/webGAL/sceneEditor.ts` - 语音生成逻辑
- `app/tts/strategy/ttsEngines.ts` - 引擎策略实现

### 扩展新引擎

要添加新的 TTS 引擎:

1. 在 `app/tts/engines/` 下创建新引擎目录
2. 实现 `TtsEngine` 接口
3. 在 `createEngine` 工厂函数中添加新引擎
4. 更新 `RenderProps.ttsEngine` 类型定义
5. 在 UI 中添加引擎选择按钮和配置表单
