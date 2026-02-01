# WebGAL 实时渲染架构文档

## 概述

WebGAL 实时渲染功能允许将 TuanChat 的聊天消息实时转换为 WebGAL 视觉小说格式进行预览和演出。该系统支持多房间场景管理、角色立绘、背景图片、特效、TTS 语音合成等功能。

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                       前端应用层                              │
├─────────────────────────────────────────────────────────────┤
│  RoomWindow (UI 组件)                                        │
│    ├─ 消息发送/接收                                          │
│    ├─ 实时渲染开关                                           │
│    └─ 场景预览面板                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  useRealtimeRender Hook (React 集成层)                       │
│    ├─ 状态管理                                               │
│    ├─ 生命周期管理                                           │
│    └─ API 封装                                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  RealtimeRenderer (核心渲染引擎)                             │
│    ├─ 场景管理 (多房间支持)                                  │
│    ├─ 消息渲染                                               │
│    ├─ 资源管理 (立绘、背景、音频)                            │
│    ├─ WebGAL 脚本生成                                        │
│    └─ TTS 语音合成                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  Terre API / WebSocket (通信层)                              │
│    ├─ HTTP API (文件上传、场景管理)                         │
│    └─ WebSocket (实时同步)                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  WebGAL Terre 后端                                           │
│    ├─ 游戏项目管理                                           │
│    ├─ 资源存储                                               │
│    └─ 场景文件管理                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  WebGAL 引擎 (渲染输出)                                      │
│    └─ 视觉小说演出渲染                                       │
└─────────────────────────────────────────────────────────────┘
```

## 数据组织结构

### Space-Room-Scene 三层架构

```
Space (空间)
└─ realtime_{spaceId}  ← WebGAL 游戏项目
   ├─ Room 1 (房间1)
   │  └─ {房间名}_{roomId}.txt  ← WebGAL 场景文件
   ├─ Room 2 (房间2)
   │  └─ {房间名}_{roomId}.txt
   └─ Room N (房间N)
      └─ {房间名}_{roomId}.txt
```

- **Space**: 对应一个独立的 WebGAL 游戏项目
- **Room**: 每个房间对应一个独立的 WebGAL 场景文件
- **Message**: 每条消息转换为场景文件中的一行或多行 WebGAL 脚本

### 资源管理

```
realtime_{spaceId}/
├─ game/
│  └─ scene/
│     ├─ start.txt         ← 入口场景
│     ├─ room_1.txt        ← 房间1场景
│     ├─ room_2.txt        ← 房间2场景
│     └─ ...
├─ public/
│  ├─ figures/             ← 角色立绘
│  │  ├─ sprite_123.webp
│  │  └─ ...
│  ├─ background/          ← 背景图片
│  │  ├─ bg_abc.webp
│  │  └─ ...
│  ├─ bgm/                 ← 背景音乐
│  ├─ vocal/               ← TTS 语音文件
│  └─ miniAvatar/          ← 小头像
└─ ...
```

## 核心功能模块

### 1. 初始化流程

```typescript
// 用户开启实时渲染
await realtimeRender.start();

// 内部流程：
1. 检查 WebGAL Terre 服务是否运行
2. 创建或检查游戏项目 (realtime_{spaceId})
3. 上传所有角色立绘资源
4. 上传所有背景图片资源
5. 为每个房间创建场景文件
6. 将历史消息渲染到对应场景
7. 建立 WebSocket 连接用于实时同步
8. 返回预览 URL
```

**初始化进度阶段：**
- `creating_game`: 创建游戏项目
- `fetching_avatars`: 获取头像数据
- `uploading_sprites`: 上传立绘资源
- `uploading_backgrounds`: 上传背景资源
- `creating_scenes`: 创建场景文件
- `ready`: 初始化完成

### 2. 消息渲染

#### 文本消息 (MessageType.TEXT)

```typescript
// 原始消息
{
  content: "你好，我是小明",
  userId: 123,
  roleId: 456,
  avatarId: 789
}

// 转换为 WebGAL 脚本
changeFigure:sprite_789.webp -left -next;
小明:你好，我是小明;
```

#### 黑屏文字 (MessageType.INTRO_TEXT)

```typescript
// 原始消息
{
  content: "第一章 相遇",
  messageType: 9
}

// 转换为 WebGAL 脚本
changeFigure:none -left -next;
changeFigure:none -center -next;
changeFigure:none -right -next;
intro:第一章 相遇;
```

#### 背景图片消息

```typescript
// 原始消息
{
  messageType: 2,  // IMG
  extra: {
    imageMessage: {
      url: "https://example.com/bg.jpg",
      renderType: 2  // 背景图
    }
  }
}

// 转换为 WebGAL 脚本
changeBg:bg_hash.webp -next;
```

#### 语音消息

```typescript
// 原始消息
{
  messageType: 7,  // SOUND
  extra: {
    soundMessage: {
      url: "https://example.com/voice.mp3",
      renderType: 1  // BGM
    }
  }
}

// 转换为 WebGAL 脚本
bgm:bgm_hash.mp3;
```

#### 特效消息

```typescript
// 下雨特效
{
  messageType: 8,  // EFFECT
  extra: {
    effectName: "rain"
  }
}

// 转换为 WebGAL 脚本
pixiPerform:rain -next;

// 清除特效
pixiInit -next;

// 清除背景
changeBg:none -next;

// 清除立绘
changeFigure:none -left -next;
changeFigure:none -center -next;
changeFigure:none -right -next;
```

### 3. WebGAL 脚本语法

#### 基础对话

```webgal
角色名:对话内容;
```

#### 立绘控制

```webgal
// 显示立绘
changeFigure:sprite_123.webp -left -next;        // 左侧
changeFigure:sprite_123.webp -center -next;      // 中间
changeFigure:sprite_123.webp -right -next;       // 右侧

// 清除立绘
changeFigure:none -left -next;

// 立绘动画
setTransition: -target=fig-left -enter=fadeIn -exit=fadeOut;
setAnimation:shake -target=fig-left -next;
```

#### 背景控制

```webgal
// 设置背景
changeBg:bg_image.webp -next;

// 清除背景
changeBg:none -next;
```

#### 音效控制

```webgal
// 播放 BGM
bgm:music.mp3;

// 播放音效
playEffect:sound.mp3;
```

#### 特效

```webgal
// 应用特效
pixiPerform:rain -next;      // 下雨
pixiPerform:snow -next;      // 下雪
pixiPerform:sakura -next;    // 樱花

// 清除特效
pixiInit -next;
```

#### 黑屏文字

```webgal
intro:这是黑屏文字;
```

#### 文本增强语法

```webgal
// 简单注音
[Ц]()

// 彩色文本
[重要](style=color:#FF0000\;)

// 斜体文本
[旁白](style-alltext=font-style:italic\; style=color:inherit\;)

// 复杂样式
[ǿı](style-alltext=font-size:120%\; style=color:#FF0000\; ruby=)
```

### 4. 实时同步机制

```
用户发送消息
    ↓
消息发送到后端
    ↓
后端广播消息到所有用户
    ↓
前端接收消息并更新 UI
    ↓
实时渲染器处理消息
    ↓
生成 WebGAL 脚本
    ↓
更新场景文件
    ↓
通过 WebSocket 通知 WebGAL 刷新
    ↓
WebGAL 引擎重新渲染场景
```

**WebSocket 同步消息格式：**

```json
{
  "event": "message",
  "data": "sync"
}
```

### 5. TTS 语音合成

#### 流程

```
消息文本
    ↓
调用 TTS API (IndexTTS)
    ↓
生成语音文件 (.wav)
    ↓
上传到 WebGAL 项目 (vocal/)
    ↓
生成带语音的 WebGAL 脚本
    ↓
渲染到场景
```

#### 脚本示例

```webgal
小明(vocal/tts_hash.wav):你好，我是小明;
```

#### TTS 配置

```typescript
type RealtimeTTSConfig = {
  enabled: boolean;              // 是否启用 TTS
  engine?: "index";              // TTS 引擎
  apiUrl?: string;               // API 地址
  emotionMode?: number;          // 情感模式 (0-3)
  emotionWeight?: number;        // 情感权重
  temperature?: number;          // 温度
  topP?: number;                 // top_p
  maxTokensPerSegment?: number;  // 单段最大 token
};
```

### 6. 多房间支持

#### 切换房间

```typescript
// 切换到指定房间
await realtimeRender.switchRoom(roomId);

// 内部流程：
1. 更新当前房间 ID
2. 发送 WebSocket 同步消息
3. WebGAL 跳转到对应场景
```

#### 获取房间预览 URL

```typescript
// 获取特定房间的预览链接
const url = realtimeRender.getRoomPreviewUrl(roomId);
// http://localhost:9000/games/realtime_123/room_456.txt
```

## API 参考

### RealtimeRenderer 类

#### 核心方法

```typescript
class RealtimeRenderer {
  // 初始化
  async init(options: {
    roles: UserRole[];
    avatars: RoleAvatar[];
    rooms: Room[];
    messages: ChatMessageResponse[];
    ttsConfig?: RealtimeTTSConfig;
  }): Promise<boolean>;

  // 启动渲染器
  async start(): Promise<void>;

  // 停止渲染器
  dispose(): void;

  // 渲染单条消息
  async renderMessage(message: ChatMessageResponse, roomId?: number): Promise<void>;

  // 渲染历史消息
  async renderHistory(messages: ChatMessageResponse[], roomId?: number): Promise<void>;

  // 切换房间
  async switchRoom(roomId: number): Promise<void>;

  // 重置场景
  async resetScene(roomId?: number): Promise<void>;

  // 清除背景
  async clearBackground(roomId?: number): Promise<void>;

  // 清除立绘
  async clearFigure(roomId?: number): Promise<void>;

  // 跳转到指定消息
  jumpToMessage(messageId: number, roomId?: number): boolean;

  // 更新并重新渲染消息
  async updateAndRerenderMessage(
    message: ChatMessageResponse,
    roomId?: number,
    regenerateTTS?: boolean
  ): Promise<boolean>;
}
```

### useRealtimeRender Hook

```typescript
function useRealtimeRender(options: {
  spaceId: number;
  enabled?: boolean;
  roles?: UserRole[];
  avatars?: RoleAvatar[];
  rooms?: Room[];
  ttsConfig?: RealtimeTTSConfig;
  miniAvatarEnabled?: boolean;
  voiceFiles?: Map<number, File>;
  autoFigureEnabled?: boolean;
}): {
  status: RealtimeRenderStatus;
  initProgress: InitProgress | null;
  isActive: boolean;
  previewUrl: string | null;
  start: () => Promise<boolean>;
  stop: () => void;
  renderMessage: (message: ChatMessageResponse, roomId?: number) => Promise<void>;
  renderHistory: (messages: ChatMessageResponse[], roomId?: number) => Promise<void>;
  resetScene: (roomId?: number) => Promise<void>;
  clearBackground: (roomId?: number) => Promise<void>;
  clearFigure: (roomId?: number) => Promise<void>;
  switchRoom: (roomId: number) => Promise<void>;
  getRoomPreviewUrl: (roomId: number) => string | null;
  updateRoleCache: (roles: UserRole[]) => void;
  updateAvatarCache: (avatars: RoleAvatar[]) => void;
  updateRooms: (rooms: Room[]) => void;
  jumpToMessage: (messageId: number, roomId?: number) => boolean;
  updateTTSConfig: (config: RealtimeTTSConfig) => void;
  setVoiceFile: (roleId: number, file: File) => void;
  setVoiceFiles: (voiceFiles: Map<number, File>) => void;
  updateAndRerenderMessage: (
    message: ChatMessageResponse,
    roomId?: number,
    regenerateTTS?: boolean
  ) => Promise<boolean>;
};
```

## 使用示例

### 基础使用

```typescript
import { useRealtimeRender } from "@/webGAL";

function RoomWindow({ roomId, spaceId }) {
  // 1. 初始化实时渲染
  const realtimeRender = useRealtimeRender({
    spaceId,
    enabled: true,
    roles,
    avatars,
    rooms,
    ttsConfig: {
      enabled: true,
      engine: "index",
      apiUrl: "http://localhost:9000",
    },
  });

  // 2. 启动实时渲染
  const handleStart = async () => {
    const success = await realtimeRender.start();
    if (success) {
      console.log("实时渲染已启动");
    }
  };

  // 3. 渲染新消息
  useEffect(() => {
    if (realtimeRender.isActive && newMessage) {
      realtimeRender.renderMessage(newMessage, roomId);
    }
  }, [newMessage]);

  // 4. 切换房间
  const handleSwitchRoom = async (newRoomId: number) => {
    await realtimeRender.switchRoom(newRoomId);
  };

  return (
    <div>
      <button onClick={handleStart}>开启实时渲染</button>
      <button onClick={realtimeRender.stop}>关闭实时渲染</button>
      {realtimeRender.previewUrl && (
        <iframe src={realtimeRender.previewUrl} />
      )}
    </div>
  );
}
```

### 特效控制

```typescript
// 发送特效消息
const handleSendEffect = (effectName: string) => {
  send({
    roomId,
    content: `[特效: ${effectName}]`,
    messageType: MessageType.EFFECT,
    extra: {
      effectName,  // rain, snow, sakura, none
    },
  });
};

// 清除背景
const handleClearBackground = () => {
  send({
    roomId,
    content: "[清除背景]",
    messageType: MessageType.EFFECT,
    extra: {
      effectName: "clearBackground",
    },
  });
  
  // 实时清除
  if (realtimeRender.isActive) {
    realtimeRender.clearBackground(roomId);
  }
};

// 清除立绘
const handleClearFigure = () => {
  send({
    roomId,
    content: "[清除立绘]",
    messageType: MessageType.EFFECT,
    extra: {
      effectName: "clearFigure",
    },
  });
  
  // 实时清除
  if (realtimeRender.isActive) {
    realtimeRender.clearFigure(roomId);
  }
};
```

## 环境配置

### 环境变量

```env
# WebGAL Terre API 地址
VITE_TERRE_URL=http://localhost:4001

# WebGAL 预览地址
VITE_WEBGAL_URL=http://localhost:9000
```

### Electron 集成

```typescript
// preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
  launchWebGAL: () => ipcRenderer.send("launch-webgal"),
});

// main.ts
ipcMain.on("launch-webgal", () => {
  // 启动 WebGAL Terre 进程
  const webgal = spawn("webgal-terre.exe");
});
```

## 性能优化

### 1. 资源缓存

- 立绘和背景图片只上传一次，使用 Map 缓存文件名
- TTS 语音使用内容哈希缓存，相同文本不重复生成

### 2. 增量更新

- 只更新变化的场景文件
- 使用行号映射快速定位消息位置

### 3. 批量处理

- 初始化时批量上传资源
- 历史消息批量渲染

### 4. WebSocket 心跳

- 保持连接活跃
- 断线自动重连

## 错误处理

### 常见错误

1. **WebGAL Terre 未启动**
   - 检查服务是否运行在 4001 端口
   - 使用 `launchWebGal()` 自动启动

2. **资源上传失败**
   - 检查文件格式（支持 webp, png, jpg, mp3, wav）
   - 检查文件大小限制

3. **场景文件损坏**
   - 使用 `resetScene()` 重置场景
   - 检查 WebGAL 脚本语法错误

4. **WebSocket 断连**
   - 自动重连机制
   - 消息队列缓存

## 限制与约束

1. **WebGAL Terre 版本**: 需要 >= 4.5.7
2. **立绘位置**: 仅支持 left/center/right 三个位置
3. **同时立绘数**: 最多 3 个（每个位置 1 个）
4. **TTS 引擎**: 目前仅支持 IndexTTS
5. **文件格式**:
   - 图片: webp, png, jpg
   - 音频: mp3, wav, ogg

## 调试技巧

### 1. 启用详细日志

```typescript
// 在浏览器控制台中查看
console.log("[RealtimeRenderer]", ...);
```

### 2. 检查场景文件

```
http://localhost:4001/api/manageGame/getGameAsset
  ?gameName=realtime_123
  &path=game/scene/room_456.txt
```

### 3. 查看 WebSocket 消息

```typescript
syncClient.onMessage = (msg) => {
  console.log("WebSocket Message:", msg);
};
```

### 4. 测试 TTS API

```bash
curl -X POST http://localhost:9000/infer \
  -H "Content-Type: application/json" \
  -d '{"text": "测试语音", ...}'
```

## 扩展开发

### 添加新的特效

1. 在 `handleSendEffect` 中添加特效选项
2. 在 `realtimeRenderer.ts` 中处理特效消息
3. 确保 WebGAL 支持该特效

### 自定义渲染逻辑

```typescript
class CustomRenderer extends RealtimeRenderer {
  protected override async renderMessage(
    message: ChatMessageResponse,
    roomId?: number
  ): Promise<void> {
    // 自定义渲染逻辑
    await super.renderMessage(message, roomId);
  }
}
```

## 相关文档

- [WebGAL 官方文档](https://docs.openwebgal.com/)
- [WebGAL Terre API](https://github.com/OpenWebGAL/WebGAL_Terre)
- [TTS 集成指南](./TTS-INTEGRATION.md)
- [TTS 使用文档](./TTS-USAGE.md)

## 更新日志

### v0.2.0 (2025-01-10)
- 添加清除立绘功能
- 优化特效消息处理
- 修复 extra 字段序列化问题

### v0.1.0 (2024-12-01)
- 初始版本
- 支持基础消息渲染
- 支持多房间场景
- 集成 TTS 语音合成
