**WebGAL 实时渲染实现报告**

**概述**
- 目的：将聊天室的消息实时投递到 WebGAL（Terre）引擎进行可视化预览（立绘、背景、对白、TTS）。
- 范围：项目中与实时渲染相关的代码、数据流、TTS 集成、文件同步、跳转（jump）机制、以及与前端 UI 的联动点。

**关键文件与组件**
- `app/webGAL/realtimeRenderer.ts` — 实时渲染核心类 `RealtimeRenderer`，负责：游戏/场景创建、资源上传、场景文件管理、生成并上传 TTS、维护消息->行号映射、通过 WebSocket 发送同步指令（jump/sync）。
- `app/webGAL/useRealtimeRender.ts` — React Hook 封装 `RealtimeRenderer`，供组件调用（start/stop、renderMessage、renderHistory、jump 等）。
- `app/webGAL/fileOperator.ts` — 文件操作与 WebGAL API 交互（上传文件、读写场景文件、检查文件存在等）。
- `app/webGAL/webgalSync.ts` — WebSocket 客户端抽象（用于与 Terre 的 webgalsync 通信）。
- `app/components/chat/roomWindow.tsx` — 与消息历史、实时渲染逻辑交互：触发历史渲染、接收新消息增量渲染、传递 `defaultFigurePositionMap`、提供 `jumpToMessageInWebGAL` 回调等。
- `app/components/chat/chatBubble.tsx` — 单条消息 UI，支持编辑 `voiceRenderSettings`（情感向量、立绘位置），并在更新后调用 WebGAL 重新渲染。
- `app/webGAL/*` 文档：`REALTIME-RENDER.md`, `TTS-INTEGRATION.md`, `TTS-USAGE.md`（设计与使用说明）。

**核心数据结构**
- `ChatMessageResponse`：外部 API 类型，包含 `message: Message`。
- `Message.webgal?: Record<string, any>`：用于保存 WebGAL 相关的渲染设置（约定结构 `voiceRenderSettings: { emotionVector?: number[], figurePosition?: 'left'|'center'|'right' }`）。
- `RealtimeRenderer` 内部：
  - `sceneContextMap: Map<roomId, {lineNumber, text}>` — 场景文件上下文（行计数、内容），append 行时更新并写入文件。
  - `messageLineMap: Map<"{roomId}_{messageId}", lineNumber>` — 消息到场景行号的映射，供 jump 使用。 
  - `uploadedSpritesMap`, `uploadedBackgroundsMap`, `uploadedVocalsMap` — 缓存已上传资源名，避免重复上传。

**业务实现与流程（分步骤）**
1. 初始化（`RealtimeRenderer.init()` / `useRealtimeRender.start()`）
   - 以 `spaceId` 创建或确认游戏 `realtime_{spaceId}` 目录，创建必要子目录（game/figure, game/background, game/scene, vocal）。
   - 调用 `initScene()` 为每个房间创建场景文本文件，并写入初始指令（如 `changeBg:none`、`changeFigure:none`）。
   - 预加载并上传所有角色立绘（`preloadSprites()` -> `uploadSprite()`）。
   - 连接到 Terre 的 WebSocket（`VITE_TERRE_WS`）以便发送 jump/sync 命令。

2. 历史消息批量渲染（`useRealtimeRender.renderHistory()` -> `RealtimeRenderer.renderHistory()`）
   - Hook 层先确保所有头像（avatar）信息已加载到 renderer 缓存（避免渲染时缺少 avatar）。
   - 批量调用 `renderMessage(message, roomId, syncToFile=false)`，在所有行追加完成后一次性 `syncContextToFile` 并 `sendSyncMessage`（减少频繁 IO）。
   - 在批量渲染前会注入默认立绘位置（从 `defaultFigurePositionMap`），确保历史消息能以期望位置呈现。

3. 增量/实时渲染（新消息）
   - 前端消息流（IndexedDB 或后端推送）更新 `historyMessages` 后，`roomWindow` 的 effect 触发 `renderMessage(latestMessage, roomId)`。
   - `renderMessage` 会：
     - 过滤非文本/撤回/指令消息；
     - 上传背景或立绘资源（调用 `uploadBackground` / `getAndUploadSprite`）；
     - 从 `message.webgal.voiceRenderSettings` 读取 `figurePosition`（默认 `left` 或前端注入的默认值）、`emotionVector`；
     - 生成 TTS（若启用，调用 `generateAndUploadVocal`，该函数会：生成 cacheKey、检查缓存/正在生成队列、调用 IndexTTS API、将生成的 base64 上传到 WebGAL）；
     - 逐行追加场景文本：先 `changeFigure:... -{position} {transform} -next;`，再 `角色名: 对白 -{vocalFile?}`；
     - 更新 `messageLineMap`，并 `sendSyncMessage` 触发 Terre 前端跳转显示最新行。

4. 跳转与同步（Jump）
   - `getAsyncMsg(sceneName, lineNumber)` 生成 jump 消息（`command: DebugCommand.JUMP`），通过 `syncSocket.send` 发送至 Terre。
   - `RealtimeRenderer.jumpToMessage(messageId)` 使用 `messageLineMap` 查找行号并发送 jump。用于 UI 点击跳转或消息更新后的跳转。

5. 消息更新后的重渲染
   - 新增 `updateAndRerenderMessage(message, roomId, regenerateTTS)`：
     - 可删除 TTS 缓存并重新生成（当情感向量变化时）；
     - 调用 `renderMessage` 更新场景文件并跳转到该消息行。
   - 前端在 `chatBubble` 修改声线/立绘位置后，会调用后端更新接口，再调用 `updateAndRerenderMessageInWebGAL` 来触发 WebGAL 重渲染与跳转。

**TTS 集成细节**
- 使用 `app/tts/engines/index` 的 API 规范（`InferRequest` / `infer`）。
- 生成流程：参考音频（角色 voiceUrl 或上传的参考音频 File）-> ת base64 -> 组合 `InferRequest`（含 emo_vector、emo_mode 等）-> 调用 TTS 服务 -> 返回 base64 音频 -> 上传到 WebGAL 的 `games/.../game/vocal/`，并缓存文件名。
- 使用 `uploadedVocalsMap` 与 `ttsGeneratingMap` 避免重复生成与上传。
- 情感向量来源：优先使用 `message.webgal.voiceRenderSettings.emotionVector`，否则从 `avatar.avatarTitle` 转换（`convertAvatarTitleToEmotionVector`）。

**关键实现注意点（已修复/需关注）**
- 立绘位置：`renderMessage` 中不应硬编码 `-left`，而应使用 `message.webgal.voiceRenderSettings.figurePosition`（已修复）。
- 默认立绘位置：在历史渲染和新消息渲染前注入 `defaultFigurePositionMap` 的默认值（已实现）。
- 更新消息后需要触发重渲染并根据情感向量决定是否重新生成 TTS（实现了 `updateAndRerenderMessage` 并在 UI 更新后调用）。
- 缓存与并发：TTS 的生成使用内存 map 防止重复；上传文件检查 `checkFileExist` 来节约上传带宽。

**运行与调试**
- 启动开发服务：在项目根运行：

```powershell
pnpm dev
```

- WebGAL（Terre）地址由环境变量 `VITE_TERRE_URL` 和 `VITE_TERRE_WS` 指定。预览 URL 可由 `RealtimeRenderer.getPreviewUrl(roomId)` 获取（示例: `http://<terre>/games/realtime_{spaceId}/index.html?scene={scene}.txt`）。
- 当 WebSocket 未连接时，`RealtimeRenderer` 会把要发送的同步消息入队，连接后自动发送。

**建议与扩展**
- 将 `voiceRenderSettings` 的类型化定义放到共享类型文件，避免使用 `any`/`as any`。
- 提供开发模式下的 TTS 缓存清理命令以便调试情感向量变化。
- 增加对多房间同时渲染的支持（当前 Hook 将 `rooms` 作为数组，但 `roomWindow` 只传入当前房间）。
- 在 UI 中提供“重新生成语音”按钮，触发 `updateAndRerenderMessage(regenerateTTS=true)`。

**文件位置索引**
- 核心实现： `app/webGAL/realtimeRenderer.ts`
- Hook： `app/webGAL/useRealtimeRender.ts`
- 场景/文件操作： `app/webGAL/fileOperator.ts`
- WebSocket sync： `app/webGAL/webgalSync.ts`
- UI 触发点： `app/components/chat/roomWindow.tsx`, `app/components/chat/chatBubble.tsx`

---
报告由代码阅读生成。如需我把报告改成 PDF、提交到 Git（创建分支并 PR），或把某个实现拆成更小的任务并直接修改代码，请告诉我下一步要做的事项。