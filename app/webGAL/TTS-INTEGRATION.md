/**
 * TTS 集成修改说明文档
 * 
 * 这个文档说明了如何将新的 TTS API 集成到 WebGAL 渲染系统中
 */

## 修改概述

已成功将 TTS 文件夹从 `app/webGAL/` 移动到 `app/tts/`，并更新了相关代码以使用新的 TTS API 接口。

## 主要修改

### 1. SceneEditor.ts 修改

**文件位置**: `app/webGAL/sceneEditor.ts`

**主要更改**:
- 添加了新的 TTS API 导入：
  ```typescript
  import { EmotionControlMethod, generateSpeechSimple } from "@/tts/ttsService";
  ```

- 重写了 `uploadVocal` 方法：
  - 移除了旧的 `tuanchat.ttsController.textToVoiceHobbyist` 调用
  - 改用新的 `generateSpeechSimple` API
  - 添加了参考音频文件支持 (`refVocal?: File`)
  - 使用 `EmotionControlMethod.SAME_AS_VOICE` 作为默认情感控制
  - 改进了错误处理和日志记录

**新的方法签名**:
```typescript
public async uploadVocal(message: ChatMessageResponse, refVocal?: File): Promise<string | undefined>
```

### 2. ChatRenderer.ts 修改

**文件位置**: `app/webGAL/chatRenderer.ts`

**主要更改**:
- 修改了 `uploadVocal` 调用，传递参考音频文件：
  ```typescript
  vocalFileName = await this.sceneEditor.uploadVocal(
    { ...messageResponse, message: { ...messageResponse.message, content: segment } }, 
    this.renderProps.referenceAudio
  );
  ```

### 3. RenderProps 接口统一

**文件位置**: `app/components/chat/window/renderWindow.tsx`

**主要更改**:
- 在 `RenderProps` 接口中添加了 `referenceAudio?: File` 字段，与 `roomSettingWindow.tsx` 保持一致

## 新的语音生成流程

1. **用户上传参考音频**: 在房间设置窗口中，用户可以上传参考音频文件
2. **传递参考音频**: 渲染过程中，参考音频会传递给 `uploadVocal` 方法
3. **TTS 生成**: 使用新的 TTS API (`generateSpeechSimple`) 生成语音
4. **文件缓存**: 使用 hash 作为文件名，避免重复生成
5. **上传到 WebGAL**: 将生成的音频文件上传到 WebGAL 引擎

## 兼容性

- **向后兼容**: 如果没有提供参考音频，系统会优雅地跳过语音生成
- **错误处理**: 添加了完善的错误处理，TTS 生成失败时不会影响其他功能
- **缓存机制**: 保持了原有的文件缓存机制，避免重复生成相同内容的语音

## 配置要求

确保在 `.env.development` 文件中配置了正确的 TTS 服务 URL：
```env
VITE_TTS_URL=http://localhost:8000
```

## 使用方式

1. 在房间设置中启用语音合成功能
2. 上传参考音频文件（可选）
3. 开始渲染，系统会自动使用新的 TTS API 生成语音

## 注意事项

- 参考音频文件是可选的，如果没有提供，会跳过语音生成
- TTS 生成过程是异步的，会有适当的错误处理
- 生成的语音文件会自动缓存，避免重复生成
- 新的 TTS API 支持更多的情感控制选项，当前使用默认设置