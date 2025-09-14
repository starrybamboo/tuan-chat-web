# TTS API 前端接口

这个模块为IndexTTS后端提供了完整的TypeScript前端接口。

## 文件结构

- `apis.ts` - 核心API接口定义和HTTP客户端
- `index.ts` - 模块入口文件，导出所有类型和工具函数
- `hooks.tsx` - React Query hooks，用于在React组件中使用TTS功能

## 使用方法

### 1. 基本使用

```typescript
import { ttsApi, createDefaultTTSRequest, EmoControlMethod } from "@/tts";

// 上传音频文件
const uploadResult = await ttsApi.uploadFile(audioFile);
console.log(uploadResult.fileId);

// 创建TTS任务
const ttsRequest = {
  ...createDefaultTTSRequest(uploadResult.fileId, "你好，这是一个测试文本。"),
  emoControlMethod: EmoControlMethod.NONE,
  async_mode: true
};

const result = await ttsApi.createTTS(ttsRequest);
console.log(result.jobId);
```

### 2. 使用React Hooks

```typescript
import { 
  useUploadFile, 
  useCreateTTS, 
  useTTSJobPolling,
  useHealthCheck
} from "@/tts/hooks";

function TTSComponent() {
  const { data: health, isLoading: healthLoading } = useHealthCheck();
  const uploadMutation = useUploadFile();
  const createTTSMutation = useCreateTTS();
  const { 
    status, 
    isCompleted, 
    isSucceeded, 
    progress, 
    audioUrl 
  } = useTTSJobPolling(jobId);

  // 使用hooks...
}
```

### 3. 情感控制方法

```typescript
import { EmoControlMethod } from "@/tts";

// 无情感控制
const request1 = {
  emoControlMethod: EmoControlMethod.NONE,
  // ...
};

// 使用参考音频控制情感
const request2 = {
  emoControlMethod: EmoControlMethod.REFERENCE,
  emoRefFileId: "uploaded-reference-file-id",
  emoWeight: 0.8,
  // ...
};

// 使用情感向量控制
const request3 = {
  emoControlMethod: EmoControlMethod.VECTOR,
  emoVec: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], // 8个浮点数
  // ...
};

// 使用文本描述控制情感
const request4 = {
  emoControlMethod: EmoControlMethod.TEXT,
  emoText: "高兴的、激动的",
  // ...
};
```

### 4. 任务状态监控

```typescript
import { useTTSJobPolling, JobStatus } from "@/tts";

function TaskMonitor({ jobId }: { jobId: string }) {
  const {
    status,
    isInProgress,
    isCompleted,
    isSucceeded,
    isFailed,
    progress,
    stage,
    audioUrl,
    errorMessage
  } = useTTSJobPolling(jobId);

  if (isInProgress) {
    return <div>进度: {progress}% - {stage}</div>;
  }

  if (isSucceeded && audioUrl) {
    return <audio src={audioUrl} controls />;
  }

  if (isFailed) {
    return <div>错误: {errorMessage}</div>;
  }

  return <div>等待中...</div>;
}
```

## 环境变量

确保在`.env`文件中设置TTS后端URL：

```
VITE_TTS_URL=http://localhost:8000
```

## API 接口说明

### 核心接口

- `healthCheck()` - 健康检查
- `uploadFile(file)` - 上传音频文件
- `getSegments(request)` - 文本分段
- `createTTS(request)` - 创建TTS任务
- `getTTSStatus(jobId)` - 获取任务状态
- `getTTSJobs()` - 获取所有任务
- `downloadFile(filename)` - 下载音频文件

### 主要类型

- `TTSRequest` - TTS请求参数
- `TTSJobStatus` - 任务状态
- `GenerationParams` - 生成参数
- `SegmentsRequest/Response` - 文本分段相关

### 工具函数

- `createDefaultGenerationParams()` - 创建默认生成参数
- `createDefaultTTSRequest(promptFileId, text)` - 创建默认TTS请求

## 注意事项

1. 所有API调用都会抛出异常，需要适当的错误处理
2. 异步模式下，需要通过轮询获取任务状态
3. 上传的音频文件应该是支持的格式（wav、mp3、flac、m4a）
4. 情感向量必须是8个浮点数的数组