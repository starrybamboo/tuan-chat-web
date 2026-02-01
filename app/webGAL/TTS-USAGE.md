# TTS 语音合成使用说明

## 功能概览

WebGAL 渲染支持两种 TTS 引擎:

- **IndexTTS2**: 默认引擎,支持情感向量控制
- **GPT-SoVITS**: 支持多语言和高质量语音合成

## 快速开始

### 1. 启用语音合成

在渲染窗口中,打开"语音合成"开关。

### 2. 上传角色参考音频

为每个需要语音的角色上传参考音频文件(支持 wav、mp3 等格式)。

### 3. 开始渲染

点击"开始渲染",系统会自动为每条对话生成语音。

## 引擎说明

### IndexTTS2 (默认)

✅ **特点**:
- 支持 8 维情感向量控制
- 自动根据角色头衔映射情感
- 基于上传的参考音频克隆音色

📦 **要求**:
- 本地运行 IndexTTS2 服务 (端口 9000)

### GPT-SoVITS

✅ **特点**:
- 多语言支持(中文、英文、日文、粤语、韩文等)
- 高质量语音克隆
- ✨ 支持使用上传的角色音频(无需手动配置服务器路径)

📦 **要求**:
- 本地运行 GPT-SoVITS 服务 (端口 9880)
- GPT-SoVITS 需要能访问 WebGAL 的文件系统

## 技术细节

### 音频处理流程

**IndexTTS2**:
```
用户上传音频 → ת base64 → 发送给 IndexTTS2 API → 生成语音
```

**GPT-SoVITS**:
```
用户上传音频 → 上传到 WebGAL 服务器 → GPT-SoVITS 读取文件 → 生成语音
```

### 音频存储位置

- **IndexTTS2**: 临时存储在浏览器内存中
- **GPT-SoVITS**: 上传到 `games/{gameName}/game/vocal/ref/` Ŀ¼

### 切换引擎

系统默认使用 IndexTTS2 引擎。如需使用 GPT-SoVITS,需要在代码层面配置:

```typescript
// 在 chatRenderer.ts 中修改
const ttsOptions = {
  engine: "gpt-sovits", // 改为 gpt-sovits
  // ...其他配置
};
```

## 常见问题

### Q: GPT-SoVITS 提示找不到音频文件?

**A**: 确保:
1. WebGAL 服务正常运行
2. GPT-SoVITS 可以访问 WebGAL 的文件系统
3. 如果两个服务在不同机器上,配置共享存储或 NFS

### Q: 为什么不同角色使用相同的音色?

**A**: 
- **IndexTTS2**: 每个角色使用各自上传的参考音频
- **GPT-SoVITS**: 当前版本所有角色共享同一个参考音频配置

### Q: 如何提高语音生成质量?

**A**:
1. 使用高质量的参考音频(清晰、无噪音)
2. 参考音频长度建议 3-10 秒
3. 参考音频内容最好包含多种情感
4. IndexTTS2 的情感向量可以微调

## 相关文档

- [TTS 引擎技术文档](../tts/README.md)
- [WebGAL 场景编辑器](./sceneEditor.ts)
- [聊天渲染器](./chatRenderer.ts)
