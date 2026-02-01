# WebGAL 实时渲染集成文档

本文档详细说明了 Tuan Chat Web 项目中集成的 WebGAL 实时渲染功能。该功能允许将聊天室的消息实时投递到本地运行的 WebGAL (Terre) 引擎中，并在聊天室侧边栏进行可视化展示。

## 0. 入口与开关

*   聊天输入区右上角的工具栏中，需先开启“联动模式”，实时渲染开关才会出现（和其它联动相关控件保持一致）。

## 1. 核心架构

整个功能由以下几个核心部分组成：

*   **`RealtimeRenderer` (Core Class)**: 单例模式的核心渲染器，负责与 WebGAL Terre 后端 API 和 WebSocket 进行通信。处理底层的资源上传、场景控制和指令发送。
*   **`useRealtimeRender` (React Hook)**: 封装了渲染器的生命周期管理，连接 React 组件状态与底层渲染器。负责处理头像获取、进度状态管理。
*   **`roomWindow.tsx` (Integration)**: 聊天室主窗口，负责触发渲染开启/关闭，协调历史消息的加载，并展示加载进度 Toast。
*   **`webGALPreview.tsx` (UI)**: 侧边栏组件，通过 iframe 嵌入 WebGAL 的运行画面。

## 2. 渲染逻辑详解 (重点)

渲染逻辑是本功能的重中之重，分为**初始化**、**历史消息回放**和**实时增量更新**三个阶段。

### 2.0 结构映射 (Realtime Structure Mapping)

实时渲染现在同样遵循层级映射关系，与非实时渲染保持一致：

*   **Space (团) -> Game Project (游戏工程)**
    *   整个实时渲染会创建一个游戏文件夹（命名为 `realtime_{spaceId}`）。
    *   所有资源和脚本都包含在这个游戏工程目录下。
*   **Room (房间) -> Scene (场景文件)**
    *   每个房间会被渲染为一个独立的 `.txt` 场景脚本文件。
    *   文件名格式为 `{roomName}_{roomId}.txt`。
*   **Room Connections -> Branch Selections**
    *   系统会生成一个 `start.txt` 作为入口场景，包含跳转到所有已创建房间场景的选项。

### 2.1 初始化与资源预加载流程

当用户点击"开启实时渲染"时，触发以下流程：

1.  **服务检查**: `roomWindow` 首先轮询 WebGAL 端口，确保服务已启动。
2.  **Hook 启动 (`useRealtimeRender.start`)**:
    *   **获取头像**: 遍历当前房间的角色列表，批量请求后端 API 获取角色头像信息。
    *   **进度反馈**: 状态更新为 `fetching_avatars`。
3.  **渲染器初始化 (`RealtimeRenderer.init`)**:
    *   **创建游戏**: 检查本地是否存在对应 Space ID 的游戏目录。
        *   *策略*: 通过 `manageGameControllerCreateGame` 创建空项目（不传 `templateDir`）；创建失败则直接返回失败，由上层提示用户检查 WebGAL(Terre) 状态。
    *   **创建房间场景**: 为每个房间创建独立的场景文件 (`{roomName}_{roomId}.txt`)。
        *   **进度反馈**: 状态更新为 `creating_scenes`，实时报告 (current/total)。
    *   **生成入口场景**: 创建 `start.txt`，包含跳转到各房间的选项 (`choose` 指令)。
    *   **全量预加载立绘 (`preloadSprites`)**:
        *   遍历所有已获取的角色头像。
        *   将头像图片上传至 WebGAL 对应目录。
        *   **关键点**: 这一步是为了避免后续渲染消息时出现立绘缺失或加载延迟。
        *   **进度反馈**: 状态更新为 `uploading_sprites`，实时报告 (current/total)。
    *   **连接 WebSocket**: 建立与 WebGAL 的实时指令通道。

### 2.2 历史消息渲染逻辑 (Historical Rendering)

为了让用户看到完整的对话上下文，系统会在初始化完成后，一次性渲染当前加载的所有历史消息。

*   **触发时机**: `realtimeRender.start()` 返回 `true` (成功) 后，在 `roomWindow` 中执行。
*   **执行逻辑**:
    1.  获取当前 `historyMessages` 列表。
    2.  **顺序执行**: 使用 `for` 循环遍历历史消息。
### 2.2 历史消息批量渲染 (Bulk Render)

**触发时机**: 当 `realtimeRender.isActive` 变为 `true` 且 `historyMessages` 可用时，由 `roomWindow.tsx` 中专门的 `useEffect` 自动触发。

**执行流程**:

1.  **条件检查**:
    *   `realtimeRender.isActive === true`
    *   `hasRenderedHistoryRef.current === false` (确保只执行一次)
    *   `isRenderingHistoryRef.current === false` (防止重复执行)
    *   `historyMessages` 存在且不为空
    *   `chatHistory?.loading === false` (确保消息加载完成)
2.  **遍历消息**: 对每一条历史消息调用 `await realtimeRender.renderMessage(message, roomId)`。
    *   *设计考量*: 必须使用 `await` 确保 WebGAL 按正确顺序处理指令，防止时序错乱导致演出效果错误（如立绘切换顺序不对）。
3.  **进度提示**: 每处理 10 条消息（或最后一条），更新一次 UI Toast (`正在渲染历史消息 x/y`)。
4.  **标记完成**: 渲染结束后，设置 `hasRenderedHistoryRef.current = true`，并记录最后一条消息 ID (`lastRenderedMessageIdRef`)。

### 2.3 实时增量渲染逻辑 (Incremental Rendering)

当历史消息渲染完成后，系统进入实时监听模式。

*   **监听机制**: `roomWindow` 中的 `useEffect` 监听 `historyMessages` 的变化。
*   **过滤条件**:
    *   `realtimeRender.isActive` Ϊ true。
    *   `hasRenderedHistoryRef.current` Ϊ true (确保历史消息已处理完)。
    *   新消息 ID 不等于 `lastRenderedMessageIdRef.current` (防止重复渲染)。
*   **执行动作**:
    *   调用 `realtimeRender.renderMessage(latestMessage, roomId)`。
    *   更新 `lastRenderedMessageIdRef`。
*   **动态资源加载**:
    *   如果在实时过程中遇到了新角色（缓存中没有头像），`useRealtimeRender` 会即时请求头像信息并上传，然后再执行渲染指令。

### 2.4 消息转 WebGAL 指令 (`renderMessage` 内部细节)

`RealtimeRenderer.renderMessage` 方法将聊天消息转换为 WebGAL 的演出指令：

补充说明：WebGAL “指令消息”现在使用显式消息类型 `WEBGAL_COMMAND`（`messageType=10`）表示，渲染侧不再通过“内容以 `%` 开头”来判定是否为指令。

1.  **解析消息**: 提取发送者名称、头像、内容。
2.  **立绘处理**:
    *   检查该角色是否已有立绘资源。
    *   如果没有，尝试即时上传 (`getAndUploadSprite`)。
    *   发送 `changeCharacter` 指令，显示角色立绘。
3.  **背景处理** (如果消息包含背景指令):
    *   识别特殊指令（如 `/bg url`）。
    *   下载并上传背景图。
    *   发送 `changeBackground` 指令。
    *   **清除背景**: 通过导演控制台的"清除背景"按钮，可以发送一个特殊的图片消息（1x1透明像素），清空当前背景。
4.  **文本演出**:
    *   发送 `showText` 指令，在对话框显示消息内容。

### 2.5 导演控制台

在开启联动模式后，聊天工具栏会显示"导演控制台"按钮（扳手图标），提供以下功能：

*   **天气特效**: 下雨、下雪、樱花等视觉效果
*   **停止特效**: 清除当前所有特效
*   **清除背景**: 发送一个透明图片消息，清空 WebGAL 的背景图
    *   实现原理：发送一个包含 1x1 透明像素的图片消息，`background` 字段设置为 `true`
    *   该消息会被实时渲染系统识别并应用，将背景替换为透明/空白状态


## 3. 进度反馈机制

为了优化用户体验，系统实现了一套完整的进度反馈：

*   **数据结构**: `InitProgress` 类型包含 `phase` (阶段), `current`, `total`, `message`。
*   **传递链路**:
    `RealtimeRenderer` (updateProgress) -> `onProgressChange` 回调 -> `useRealtimeRender` (setInitProgress) -> `roomWindow` (useEffect 监听) -> `toast.loading`。
*   **覆盖阶段**:
    1.  启动服务
    2.  获取头像数据
    3.  创建游戏实例
    4.  上传立绘资源
    5.  渲染历史消息

## 4. 关键文件清单

| 文件路径 | 职责 |
| :--- | :--- |
| `app/webGAL/realtimeRenderer.ts` | **核心逻辑**。负责 WebGAL API 调用、资源管理、WebSocket 通信。 |
| `app/webGAL/useRealtimeRender.ts` | **状态管理**。React Hook，处理头像数据获取，暴露状态给 UI。 |
| `app/components/chat/roomWindow.tsx` | **业务集成**。控制渲染开关，协调历史消息渲染，显示进度 Toast。 |
| `app/components/chat/sideDrawer/webGALPreview.tsx` | **预览界面**。侧边栏 iframe 组件。 |

## 5. 错误处理与降级

*   **创建失败**: 不再做本地目录结构兜底；初始化直接失败，并由上层提示用户检查 WebGAL(Terre) 是否可用。
*   **资源缺失**: 如果立绘上传失败，仅在控制台报错，不中断流程，WebGAL 将使用默认或空白立绘显示文本。
*   **服务超时**: 启动时若 WebGAL 未响应，自动关闭开关并提示错误。

## 6. 非实时渲染 (导出模式)

除了实时渲染外，系统还支持将聊天记录导出为完整的 WebGAL 游戏工程，以便离线运行或发布。

### 6.1 核心架构 (Export Architecture)

*   **`ChatRenderer`**: 导出模式的核心控制器。负责遍历房间、处理消息流、协调 TTS 和资源上传。
*   **`SceneEditor`**: 负责生成 WebGAL 的脚本文件 (`.txt`)，管理场景切换和对话写入。
*   **`RenderWindow`**: 导出功能的 UI 入口，负责收集用户配置（如是否开启 TTS、选择房间等）。

### 6.2 结构映射 (Structure Mapping)

非实时渲染遵循严格的层级映射关系，将聊天室结构转换为游戏结构：

*   **Space (团) -> Game Project (游戏工程)**
    *   整个导出过程会生成一个独立的游戏文件夹（通常命名为 `preview_{spaceId}`）。
    *   所有资源和脚本都包含在这个游戏工程目录下。
*   **Room (房间) -> Scene (场景文件)**
    *   每个被选中的聊天室房间会被渲染为一个独立的 `.txt` 场景脚本文件。
    *   文件名格式通常为 `{roomName}_{roomId}.txt`。
*   **Room Connections (地图连接) -> Branch Selections (分支选项)**
    *   房间之间的拓扑关系（如地图移动）会被转换为 WebGAL 的 `choose` 指令。
    *   在每个场景的末尾，系统会生成跳转到相邻房间的选项，形成完整的探索流程。
    *   同时会生成一个 `start.txt` 作为入口场景，包含跳转到所有已渲染房间的选项。

### 6.3 导出流程详解

导出过程是一个批处理任务，主要包含以下步骤：

1.  **初始化 (`initializeRenderer`)**:
    *   `RenderWindow` 收集配置 (`RenderProps`) 和数据 (`RenderInfo`)。
    *   实例化 `ChatRenderer`。
    *   准备参考音频（如果开启 TTS）：尝试从 `roleAudios` 或 `role.voiceUrl` 获取角色的参考音频文件。
2.  **渲染循环**:
    *   遍历选定的房间列表。
    *   为每个房间创建一个独立的场景文件 (`sceneName = roomName_roomId`)。
    *   调用 `renderMessages` 处理房间内的所有消息。
3.  **消息处理 (`renderMessages`)**:
    *   **预处理**: 过滤非文本消息，按时间排序。
    *   **背景指令**: 识别图片消息中的背景设置，上传背景图并写入 `changeBg` 指令。
    *   **文本处理**:
        *   **文本拆分**: 使用 `splitContent` 将长文本按标点符号拆分为多个短句，以适应 AVG 演出节奏。
        *   **TTS 生成**: 对每个短句调用 TTS 引擎生成语音文件 (`uploadVocal`)。
        *   **立绘管理**: 检查并上传角色立绘，根据回复关系决定左右立绘的显示 (`leftSpriteName`, `rightSpriteName`)。
        *   **写入对话**: 调用 `sceneEditor.addDialog` 生成最终的 WebGAL 对话指令。

补充说明：导出模式同样支持 WebGAL “指令消息”，通过显式消息类型 `WEBGAL_COMMAND`（`messageType=10`）直接把 `content` 写入场景脚本；渲染侧不再依赖“内容以 `%` 开头”的隐式协议。
4.  **分支生成**:
    *   根据房间连接关系 (`roomMap`)，使用 `getBranchSentence` 生成选项跳转指令 (`choose:选项A:sceneA|选项B:sceneB`)，实现多结局或多分支剧情。

### 6.3 TTS 集成 (Text-to-Speech)

导出模式深度集成了 TTS 功能，支持为角色自动生成语音。

*   **引擎支持**: 支持 GPT-SoVITS 和 IndexTTS 等多种引擎。
*   **情感映射**: `convertAvatarTitleToEmotionVector` 方法会将角色的情感标签（如"ϲ", "ŭ"）自动转换为 TTS 引擎所需的 8 维情感向量。
*   **参考音频**: 支持为每个角色指定参考音频，以克隆特定声线。

### 6.4 关键文件清单 (Export)

| 文件路径 | 职责 |
| :--- | :--- |
| `app/webGAL/chatRenderer.ts` | **导出控制器**。负责导出流程的编排和逻辑控制。 |
| `app/webGAL/sceneEditor.ts` | **脚本生成器**。负责生成 WebGAL 脚本语法和文件操作。 |
| `app/components/chat/window/renderWindow.tsx` | **导出 UI**。用户配置界面。 |

