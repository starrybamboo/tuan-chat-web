# WebGAL 实时渲染功能

## 功能介绍

实时渲染功能允许将聊天室中的消息实时投递到 WebGAL 进行视觉小说风格的渲染预览。当开启此功能后，每条新消息都会自动同步到 WebGAL，并在浏览器中打开预览页面。

## 使用方法

### 开启实时渲染

1. 进入聊天室
2. 在工具栏中找到 WebGAL 图标（位于右侧按钮组）
3. 点击图标开启实时渲染
4. 系统会自动启动 WebGAL 服务并打开预览页面
5. 图标变为绿色并闪烁表示实时渲染已激活

### 关闭实时渲染

1. 再次点击工具栏中的 WebGAL 图标即可关闭
2. 图标恢复为默认状态

## 技术实现

### 核心文件

- `app/webGAL/realtimeRenderer.ts` - 实时渲染器核心类
- `app/webGAL/useRealtimeRender.ts` - React Hook 封装
- `app/components/chat/chatToolbar.tsx` - 工具栏按钮
- `app/components/chat/roomWindow.tsx` - 聊天室窗口集成

### 工作原理

1. **WebSocket 连接**: 通过 WebSocket 连接到 WebGAL Terre 的同步接口 (`/api/webgalsync`)
2. **消息监听**: 监听聊天室的新消息
3. **场景编辑**: 将消息转换为 WebGAL 脚本并写入场景文件
4. **实时同步**: 通过 WebSocket 发送 `JUMP` 命令，让 WebGAL 跳转到最新内容

### 消息处理规则

- 仅处理文本消息（messageType = 1）
- 跳过已撤回的消息（status = 1）
- 以 `%` 开头的消息会被解析为 WebGAL 指令
- 自动上传立绘到 WebGAL

## 配置

### 环境变量

```env
# WebGAL Terre 服务地址
VITE_TERRE_URL=http://localhost:3001

# WebGAL WebSocket 同步地址
VITE_TERRE_WS=ws://localhost:3001/api/webgalsync
```

## 注意事项

1. 需要先启动 WebGAL Terre 服务
2. 在 Electron 环境下会自动启动 WebGAL
3. 实时渲染会创建一个以 `realtime_{spaceId}` 命名的游戏项目
4. 切换房间不会影响实时渲染状态
