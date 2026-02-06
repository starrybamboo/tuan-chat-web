# Chat 模块技术文档

## 模块概述

Chat 模块是 TuanChat 的核心功能模块，提供了完整的 TRPG（桌面角色扮演游戏）聊天体验。该模块不仅支持传统的即时通讯功能，还深度集成了 WebGAL 视觉小说引擎，实现了聊天内容与视觉小说场景的实时联动。

### 核心特性

- **多空间多房间架构**：支持用户创建和加入多个空间（Space），每个空间可包含多个房间（Room）
- **角色扮演系统**：用户可在房间中使用不同角色（Role）和立绘（Avatar）进行扮演
- **WebGAL 联动**：将聊天内容实时转换为 WebGAL 剧本，提供视觉小说般的阅读体验
- **富文本消息**：支持文本、图片、表情、音频、特效、背景等多种消息类型
- **消息 Thread**：支持基于 message.threadId 的线程聚合与回复（类似 Discord Thread）
- **骰子系统**：内置 TRPG 骰子命令系统，支持多种游戏规则
- **实时状态同步**：通过 WebSocket 实时同步成员状态（输入中、等待扮演、暂离等）
- **历史消息管理**：基于 IndexedDB 的本地缓存，支持离线查看和快速加载

---

## 路由约定（ChatPage）

路由定义位于 `app/routes.ts`：

- `/chat/:spaceId?/:roomId?/:messageId?`

约定与默认行为：

- `spaceId=private` 表示私聊模式
- 进入空间模式时，如果 `roomId` 缺失（例如 `/chat/10387`），前端会在房间列表加载完成后 **自动选择第一个房间**，并使用 `replace` 重定向到 `/chat/10387/<firstRoomId>`
- 兼容历史/错误 URL：如果出现 `/chat/<spaceId>/null`，会先 `replace` 回 `/chat/<spaceId>`，随后按上面的逻辑尝试选中第一个房间
- 若空间下没有任何房间，则停留在 `/chat/<spaceId>`（不拼接 `null`），由左侧列表引导用户创建/选择房间

---

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Chat Page                             │
│                     (chatPage.tsx)                           │
│                     路由层，管理空间和房间切换                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│ SpaceContext │    │ RoomContext  │      │  WebSocket   │
│  空间上下文   │    │   房间上下文  │      │   实时通信    │
└──────────────┘    └──────────────┘      └──────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐      ┌──────────────┐
│ RoomWindow   │    │  ChatFrame   │      │ RealtimeRender│
│  房间窗口     │    │   消息列表    │      │  WebGAL联动   │
└──────────────┘    └──────────────┘      └──────────────┘
        │                     │
        ▼                     ▼
┌──────────────┐    ┌──────────────┐
│ChatInputArea │    │ ChatBubble   │
│   输入组件    │    │   消息气泡    │
└──────────────┘    └──────────────┘
```

### 数据流

```
用户输入 → ChatInputArea → RoomWindow → WebSocket → 后端
                                           ↓
                                    后端处理并广播
                                           ↓
前端接收 ← WebSocket ← ChatFrame/RoomWindow ← IndexedDB缓存
    ↓
ChatBubble 渲染
    ↓
RealtimeRenderer 转换为 WebGAL 场景
```

---

## 状态管理（Zustand）

为减少跨组件 props 传递与 Context value 变化导致的级联重渲染，Chat 模块逐步把「高频 UI ״̬ / 偏好设置」迁移到 zustand store。

### 1) roomUiStore：房间内临时 UI ״̬

文件：app/components/chat/stores/roomUiStore.ts

- replyMessage：当前回复的消息
- threadRootMessageId：当前正在查看/回复的消息 Thread（root messageId）
- insertAfterMessageId：插入模式的目标消息 ID

### 2) roomPreferenceStore：聊天偏好与 WebGAL 联动设置

文件：app/components/chat/stores/roomPreferenceStore.ts

- useChatBubbleStyle：消息气泡样式（localStorage: useChatBubbleStyle）
- webgalLinkMode：WebGAL 联动模式（localStorage: webgalLinkMode）
- autoReplyMode：自动回复模式（localStorage: autoReplyMode）
- runModeEnabled：跑团模式（localStorage: runModeEnabled）
- defaultFigurePositionMap：角色默认立绘位置（localStorage: defaultFigurePositionMap）
- dialogNotend / dialogConcat：WebGAL 对话参数（当前不持久化）

### 3) roomRoleSelectionStore：当前选中角色与立绘

文件：app/components/chat/stores/roomRoleSelectionStore.ts

- curRoleIdMap：房间 -> 当前角色（localStorage: curRoleIdMap）
- curAvatarIdMap：角色 -> 当前立绘（localStorage: curAvatarIdMap）

### 4) drawerPreferenceStore：右侧抽屉宽度偏好

文件：app/components/chat/stores/drawerPreferenceStore.ts

- userDrawerWidth / roleDrawerWidth / threadDrawerWidth / initiativeDrawerWidth / mapDrawerWidth / exportDrawerWidth / webgalDrawerWidth
- 对应 localStorage key 与字段同名（保持兼容）

相关组件：

- app/components/chat/roomSideDrawers.tsx：订阅抽屉宽度 + sideDrawerStore.state 并渲染各个 `OpenAbleDrawer`，避免拖拽调整宽度/切换抽屉时触发 `RoomWindow` 整体重渲染

### 5) realtimeRenderStore：RealtimeRender / TTS 配置

文件：app/components/chat/stores/realtimeRenderStore.ts

- enabled：是否启用实时渲染（仅表示前端渲染器运行开关）
- ttsEnabled：实时渲染 TTS 开关
- miniAvatarEnabled：实时渲染小头像开关
- autoFigureEnabled：实时渲染自动填充立绘开关
- ttsApiUrl：TTS API URL（IndexedDB：realtimeRenderSettings）
- terrePortOverride：WebGAL(Terre) 端口覆盖值（IndexedDB：realtimeRenderSettings）
- terrePort：WebGAL(Terre) 实际端口（用于启动探测/连接）

运行态（不持久化，镜像自 `useRealtimeRender`）：

- status / initProgress / isActive / previewUrl

### 6) sideDrawerStore：右侧抽屉打开状态

文件：app/components/chat/stores/sideDrawerStore.ts

- state：当前右侧抽屉（none/user/role/search/initiative/map/export/webgal）
- 仅在前端内存中维护，不再写入 URL

### 7) chatInputUiStore：输入框编辑态快照

文件：app/components/chat/stores/chatInputUiStore.ts

- plainText：输入框纯文本（用于命令面板识别、发送按钮禁用态等）
- textWithoutMentions：去除 @提及节点后的纯文本（用于发送/AI prompt 等）
- mentionedRoles：输入框内解析出的提及角色列表

相关轻量订阅组件（用于避免 `RoomWindow` 因输入变化整体重渲染）：

- app/components/chat/commandPanelFromStore.tsx：仅订阅 plainText，渲染 CommandPanel
- app/components/chat/chatToolbarFromStore.tsx：订阅 plainText + 附件状态 + realtimeRenderStore.isActive，渲染 ChatToolbar

### RoomWindow 组件拆分

为进一步减小 `RoomWindow` 体积并降低局部状态变化带来的级联重渲染，拆出以下组件：

- app/components/chat/roomHeaderBar.tsx：顶部栏（返回、成员/角色/导出按钮、搜索框），内部订阅 sideDrawerStore.state
- app/components/chat/roomPopWindows.tsx：各类 `PopWindow`（创建 Thread、添加角色、渲染窗口），并在内部订阅 `roomUiStore.isCreateThreadOpen`
- app/components/chat/roomComposerPanel.tsx：输入区整块 UI（工具栏 + 输入框 + 附件预览等），内部订阅 sideDrawerStore.state
- app/components/chat/roomSideDrawerGuards.tsx：抽屉相关副作用编排（如切换空间/跑团模式时自动关闭特定抽屉），避免 `RoomWindow` 订阅 sideDrawerStore.state
- app/components/chat/realtimeRenderOrchestrator.tsx：RealtimeRender 编排与 store runtime 镜像，隔离 `useEffect` 与高频运行态

### 8) chatComposerStore：附件与发送选项

文件：app/components/chat/stores/chatComposerStore.ts

- imgFiles / emojiUrls / audioFile：输入框附件
- sendAsBackground：图片是否设为背景
- audioPurpose：音频用途（普通语音 / BGM / 音效）

相关轻量订阅组件：

- app/components/chat/chatAttachmentsPreviewFromStore.tsx：订阅附件状态，渲染输入框顶部的附件预览区域

---

## 核心文件详解

### 1. chatPage.tsx

**作用**：Chat 模块的顶层路由组件，负责整个聊天页面的布局和状态管理。

**业务流程**：

1. **路由解析**：从 URL 参数中解析 `spaceId`、`roomId`、`messageId`
   - 支持两种模式：
     - 空间模式：`/chat/:spaceId/:roomId`
     - 私聊模式：`/chat/private/:roomId`

2. **数据加载**：
   - 获取用户的空间列表（`useGetUserSpacesQuery`）
   - 获取当前空间的房间列表（`useGetUserRoomsQuery`）
   - 获取当前空间的成员列表（`useGetSpaceMembersQuery`）

3. **布局管理**：
   - 左侧：空间和房间列表（可折叠的 Drawer）
   - 中间：当前房间的聊天窗口（`RoomWindow`）
   - 右侧：侧边栏（用户详情、角色详情、搜索、地图等）

4. **状态同步**：
   - 使用 `localStorage` 记住用户最后访问的空间和房间
   - 监听 URL 变化并更新激活的空间/房间
   - 支持响应式布局（移动端/桌面端）

**关键代码片段**：

```typescript
// 空间和房间状态管理
const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
const [activeRoomId, setActiveRoomId] = useState<number | null>(null);

// 空间上下文提供
const spaceContextValue: SpaceContextType = {
  spaceId: activeSpaceId,
  ruleId: activeSpace?.ruleId,
  isSpaceOwner: activeSpace?.ownerId === userId,
  setActiveSpaceId,
  setActiveRoomId,
  spaceMembers: spaceMembersQuery.data?.data ?? [],
  toggleLeftDrawer: () => setIsOpenLeftDrawer(!isOpenLeftDrawer),
};
```

---

### 2. roomWindow.tsx

**作用**：单个房间的核心交互组件，管理消息发送、角色切换、输入状态等。

**业务流程**：

1. **初始化**：
   - 连接 WebSocket，订阅房间消息
   - 从 IndexedDB 加载历史消息
   - 初始化 RealtimeRenderer（WebGAL 联动）

2. **消息发送**：
   ```
   用户输入 → 校验 → 构建消息对象 → 发送到后端 → 等待广播
   ```
   - 支持多种消息类型：文本、图片、音频、特效、背景
   - 自动处理 @ 提及功能
   - 集成骰子命令解析

3. **角色管理**：
   - 用户可切换当前使用的角色（`curRoleId`）
   - 选择角色的立绘表情（`curAvatarId`）
   - WebGAL 联动模式下支持旁白模式（无角色）

4. **实时状态广播**：
   - 输入中（typing）：用户开始输入时广播
   - 等待扮演（wait）：等待其他玩家行动
   - 暂离（leave）：临时离开

5. **WebGAL 联动功能**：
   - 实时渲染：将聊天消息转换为 WebGAL 场景
   - 历史回溯：扫描历史消息，重建场景
   - TTS 集成：文本转语音（可选）
   - 特效控制：雨、雪、樱花等粒子特效
   - 背景管理：设置和清除背景图

**关键方法**：

```typescript
// 发送文本消息
const handleMessageSubmit = useCallback(() => {
  const message: ChatMessageRequest = {
    roomId,
    roleId: curRoleId || undefined,
    avatarId: curAvatarId || undefined,
    content: plainText,
    messageType: MessageType.TEXT,
    replyMessageId: replyMessage?.messageId,
  };
  send(message);
}, [roomId, curRoleId, curAvatarId, plainText, replyMessage]);

// 发送特效消息
const handleSendEffect = useCallback((effectName: string) => {
  send({
    roomId,
    roleId: undefined,
    avatarId: undefined,
    content: `[特效: ${effectName}]`,
    messageType: MessageType.EFFECT,
    extra: { effectMessage: { effectName } },
  });
}, [roomId, send]);

// 清除背景
const handleClearBackground = useCallback(() => {
  send({
    roomId,
    roleId: undefined,
    avatarId: undefined,
    content: "[清除背景]",
    messageType: MessageType.EFFECT,
    extra: { effectMessage: { effectName: "clearBackground" } },
  });
  toast.success("已清除背景");
}, [roomId, send]);
```

---

### 3. chatFrame.tsx

**作用**：消息列表的核心渲染组件，使用虚拟滚动优化性能，管理背景和特效状态。

**业务流程**：

1. **虚拟滚动**：
   - 使用 `react-virtuoso` 库实现虚拟滚动
   - 仅渲染可见区域的消息，优化大量消息场景
   - 支持双向加载：向上滚动加载历史消息

2. **背景管理**：
   ```
   遍历历史消息 → 提取背景图片消息（imageMessage.background=true）
                → 根据当前滚动位置计算应显示的背景
                → 检查是否有 clearBackground 特效
                → 更新背景状态
   ```
   
   **核心逻辑**（已优化支持清除背景）：
   ```typescript
   useEffect(() => {
     const currentMessageIndex = virtuosoIndexToMessageIndex(currentVirtuosoIndex);
     let newBgUrl: string | null = null;
     
     // 找到最后一个清除背景的位置
     let lastClearIndex = -1;
     for (const effect of effectNode) {
       if (effect.index <= currentMessageIndex && 
           effect.effectMessage?.effectName === 'clearBackground') {
         lastClearIndex = effect.index;
       }
     }
     
     // 从清除背景之后开始找最新的背景图片
     for (const bg of imgNode) {
       if (bg.index <= currentMessageIndex && bg.index > lastClearIndex) {
         newBgUrl = bg.imageMessage?.url ?? null;
       }
     }
     
     if (newBgUrl !== currentBackgroundUrl) {
       setCurrentBackgroundUrl(newBgUrl);
     }
   }, [currentVirtuosoIndex, imgNode, effectNode]);
   ```

3. **特效管理**：
   - 类似背景管理，根据滚动位置更新当前特效
   - 支持的特效：rain（雨）、snow（雪）、sakura（樱花）、none（清除特效）

4. **消息操作**：
   - 长按/右键菜单：复制、删除、回复、跳转到 WebGAL
   - 消息选择模式：批量删除、批量导出
   - @ 提及跳转：点击 @ 消息跳转到被提及的消息

5. **上下文菜单**：
   - 提供丰富的消息操作选项
   - 根据消息类型和用户权限显示不同选项

**性能优化**：

```typescript
// 使用 useMemo 缓存背景图片节点
const imgNode = useMemo(() => {
  return historyMessages
    .map((msg, index) => ({
      index,
      imageMessage: msg.message.extra?.imageMessage,
      status: msg.message.status,
    }))
    .filter(item => 
      item.imageMessage && 
      item.imageMessage.background && 
      item.status !== 1 // 排除已删除消息
    );
}, [historyMessages]);
```

---

### 4. chatBubble.tsx

**作用**：单条消息的渲染组件，根据消息类型和角色信息展示不同样式。

**业务流程**：

1. **消息类型判断**：
   ```typescript
   enum MessageType {
     TEXT = 1,        // 纯文本消息
     IMG = 2,         // 图片消息
     AUDIO = 3,       // 音频消息
     VIDEO = 4,       // 视频消息
     FILE = 5,        // 文件消息
     VOICE = 7,       // 语音消息
     EFFECT = 8,      // 特效消息
     INTRO_TEXT = 9,  // 引导文本
   }
   ```

2. **样式模式**：
   - **气泡模式**（默认）：类似微信的对话气泡
   - **旁白模式**：居中显示，无角色信息
     ```typescript
     const isNarrator = !message.roleId || message.roleId <= 0;
     ```

3. **渲染逻辑**：
   ```
   获取消息数据 → 判断消息类型 → 判断是否为旁白
                                ↓
                        加载角色和立绘信息
                                ↓
                        渲染消息内容（文本/ͼƬ/音频）
                                ↓
                        添加操作按钮（回复/删除/更多）
                                ↓
                        WebGAL 联动信息（位置/情感/TTS）
   ```

4. **特效消息渲染**：
   ```typescript
   if (messageType === MessageType.EFFECT) {
     return (
       <div className="narrator-message">
         <span className="badge badge-info">特效</span>
         <span>{effectMessage?.effectName}</span>
       </div>
     );
   }
   ```

5. **图片消息渲染**：
   - 支持点击预览大图
  - 背景图片特殊标记（显示“已设置为背景”提示）
  - 解锁 CG 特殊标记（显示“已解锁CG”提示）
   - 图片加载失败时显示占位符

6. **WebGAL 联动显示**：
   - 显示立绘位置（左/中/右）
   - 显示情感向量（可选）
   - 显示 TTS 设置（启用/禁用）
   - 提供快捷编辑入口

**关键代码**：

```typescript
// 判断是否为旁白模式
const isNarrator = !message.roleId || message.roleId <= 0;

// 特效消息渲染
if (messageType === MessageType.EFFECT) {
  const effectMessage = message.extra?.effectMessage;
  return (
    <div className="flex justify-center my-2">
      <div className="px-3 py-1 rounded-full bg-base-200 text-sm flex items-center gap-2">
        <span className="badge badge-info badge-sm">特效</span>
        <span className="opacity-70">{effectMessage?.effectName}</span>
      </div>
    </div>
  );
}

// 旁白样式渲染
if (isNarrator) {
  return (
    <div className="flex justify-center my-2">
      <div className="max-w-2xl px-4 py-2 bg-base-200 rounded-lg">
        <div className="text-center text-base-content/80">
          {message.content}
        </div>
      </div>
    </div>
  );
}
```

---

### 5. chatInputArea.tsx

**作用**：封装的 `contentEditable` 输入组件，支持 @ 提及、富文本、图片粘贴等功能。

**快捷键（由 `RoomWindow` 统一处理）**：

- `Enter`：发送消息
- `Shift+Enter`：换行
- `Tab`：触发 AI 重写；当存在 AI 虚影结果时，`Tab` 直接接受
- `Esc`：取消 AI 重写并恢复原文

**业务流程**：

1. **初始化**：
   - 创建 `contentEditable` div 作为输入区域
   - 通过 `useImperativeHandle` 暴露 API 给父组件

2. **@ 提及功能**：
   ```
   用户输入 @ → 触发提及面板 → 选择角色 → 插入 <span class="mention"> 节点
   ```
   
   **实现细节**：
   ```typescript
   // 插入提及节点
   const insertMention = (role: UserRole) => {
     const mentionNode = document.createElement('span');
     mentionNode.className = 'mention';
     mentionNode.contentEditable = 'false';
     mentionNode.dataset.roleId = String(role.roleId);
     mentionNode.textContent = `@${role.roleName}`;
     insertNodeAtCursor(mentionNode);
   };
   ```

3. **文本同步**：
   ```
   用户输入 → 监听 input 事件 → 解析 DOM 内容
                                ↓
                        提取纯文本和 @ 提及列表
                                ↓
                        回调给父组件（RoomWindow）
   ```

4. **图片粘贴**：
   ```typescript
   const handlePaste = (e: React.ClipboardEvent) => {
     const items = e.clipboardData.items;
     const files: File[] = [];
     
     for (const item of items) {
       if (item.type.startsWith('image/')) {
         const file = item.getAsFile();
         if (file) files.push(file);
       }
     }
     
     if (files.length > 0) {
       e.preventDefault();
       onPasteFiles(files);
     }
   };
   ```

5. **光标管理**：
   - `insertNodeAtCursor`：在光标位置插入节点
   - `getTextAroundCursor`：获取光标前后文本（用于 AI 补全）
   - `moveCursorToEnd`：将光标移动到末尾

**暴露的 API**：

```typescript
export interface ChatInputAreaHandle {
  setContent: (htmlContent: string) => void;     // 设置内容
  focus: () => void;                             // 聚焦
  insertNodeAtCursor: (node: Node | string) => boolean;  // 插入节点
  getTextAroundCursor: () => { before: string; after: string };  // 获取上下文
  getRawElement: () => HTMLDivElement | null;    // 获取 DOM 元素
  triggerSync: () => void;                       // 手动触发同步
  getPlainText: () => string;                    // 获取纯文本
}
```

---

### 6. chatToolbar.tsx

**作用**：聊天工具栏，提供消息发送、文件上传、特效控制等功能。

**业务流程**：

1. **状态选择器**：
   ```
   用户点击状态按钮 → 显示下拉菜单 → 选择状态
                                    ↓
                            广播状态到 WebSocket
                                    ↓
                            其他成员看到状态变化
   ```
   
   支持的状态：
   - `idle`：空闲（默认）
   - `input`：输入中（自动触发，也可手动设置）
   - `wait`：等待扮演（等待其他玩家行动）
   - `leave`：暂离（临时离开）

2. **文件上传**：
   - **表情上传**：使用 `EmojiWindow` 组件选择或上传表情
   - **图片上传**：使用 `ImgUploader` 组件上传图片
   - **音频上传**：通过 `<input type="file" accept="audio/*">` 上传音频

3. **WebGAL 控制面板**：
   ```
   点击 WebGAL 图标 → 显示导演控制台 → 选择功能
   ```
   
   可用功能：
   - 特效控制：rain、snow、sakura、none
   - 清除背景：发送 clearBackground 特效
   - 实时渲染开关
   - WebGAL 联动模式开关
   - 自动回复模式开关
   - 立绘位置设置：左、中、右
   - 对话参数：-notend（不停顿）、-concat（续接）

4. **AI 重写功能**：
   ```typescript
   // 使用预设提示词重写当前输入
   const handleAIRewrite = (prompt: string) => {
     // 获取当前输入
     const currentText = inputRef.current?.getPlainText();
     // 调用 AI API
     const rewrittenText = await aiRewrite(currentText, prompt);
     // 更新输入框
     inputRef.current?.setContent(rewrittenText);
   };
   ```

5. **骰子和命令面板**：
   - 点击骰子图标：打开骰子命令面板
   - 点击命令图标：打开 WebGAL 命令面板
   - 支持快捷输入：`/` 或 `.` 触发骰子/指令系统，`%` 发送 WebGAL 脚本指令（`WEBGAL_COMMAND`）
   - WebGAL 变量（空间级）：可在“导演控制台”中使用“设置变量”发送结构化变量消息（`WEBGAL_VAR`），也可输入 `/var set a=1` 作为快捷方式；变量会写入 `space.extra` 的 `webgalVars`

**关键组件结构**：

```tsx
<div className="chat-toolbar">
  {/* 左侧：状态、表情、图片、音频、骰子等 */}
  <div className="toolbar-left">
    <ChatStatusSelector />
    <EmojiButton />
    <ImageUploadButton />
    <AudioUploadButton />
    <DiceButton />
  </div>
  
  {/* 右侧：WebGAL 控制、AI 重写、发送按钮 */}
  <div className="toolbar-right">
    <WebGALControlPanel />
    <AIRewriteButton />
    <SendButton />
  </div>
</div>
```

---

### 7. chatStatusBar.tsx

**作用**：显示房间内其他成员的实时状态（输入中、等待扮演、暂离）。

**业务流程**：

1. **状态收集**：
   ```typescript
   // 从 WebSocket 获取房间内所有成员状态
   const rawStatus = webSocketUtils.chatStatus?.[roomId] ?? [];
   // 格式：[{ userId: 1, status: "input" }, { userId: 2, status: "wait" }]
   ```

2. **优先级排序**：
   ```typescript
   const statusPriority: ChatStatusType[] = ["input", "wait", "leave"];
   // idle 状态不显示
   ```

3. **分组展示**：
   ```
   同一状态的多个用户合并显示：
   - 1 人：张三 正在输入...
   - 多人：张三、李四、王五 正在输入...
   ```

4. **实时更新**：
   ```
   WebSocket 接收状态变化 → 更新 chatStatus ״̬
                            ↓
                    StatusBar 自动重新渲染
   ```

**渲染逻辑**：

```typescript
const grouped = useMemo(() => {
  const statusPriority: ChatStatusType[] = ["input", "wait", "leave"];
  const raw = (webSocketUtils.chatStatus?.[roomId] ?? []);
  const others = excludeSelf ? raw.filter(s => s.userId !== userId) : raw;
  
  return statusPriority
    .map(st => ({
      type: st,
      users: others.filter(o => o.status === st).map(o => o.userId),
    }))
    .filter(g => g.users.length > 0);
}, [roomId, webSocketUtils.chatStatus, userId]);
```

---

### 8. avatarSwitch.tsx

**作用**：角色和立绘切换器，允许用户在聊天中切换角色和表情。

**业务流程**：

1. **角色加载**：
   ```
   获取用户所有角色 → 筛选房间内可用角色 → 显示角色列表
   ```

2. **立绘加载**：
   ```
   选择角色 → 加载该角色的所有立绘 → 显示立绘列表
   ```

3. **旁白模式**（WebGAL 联动特性）：
   ```typescript
   // 在 WebGAL 联动模式下，curRoleId <= 0 时显示旁白图标
   const isNarratorMode = curRoleId <= 0 && roomContext.webgalLinkMode;
   
   if (isNarratorMode) {
     return (
       <div className="narrator-button">
         <NarratorIcon />
         <span>旁白</span>
       </div>
     );
   }
   ```

4. **切换流程**：
   ```
   用户点击头像 → 显示下拉菜单 → 显示所有角色和立绘
                                  ↓
                          点击角色/立绘
                                  ↓
                      调用 setCurRoleId / setCurAvatarId
                                  ↓
                      更新当前使用的角色/立绘
                                  ↓
                      下次发送消息时使用新角色/立绘
   ```

5. **添加角色**：
   ```typescript
   // 仅空间管理员和主持人可添加角色
   if ((roomContext.curMember?.memberType ?? 3) < 3) {
     return (
       <button onClick={() => setIsRoleAddWindowOpen(true)}>
         添加角色
       </button>
     );
   }
   ```

**组件结构**：

```tsx
<div className="avatar-switch">
  {/* 当前角色/立绘显示 */}
  <div className="current-avatar">
    {isNarratorMode ? (
      <NarratorIcon />
    ) : (
      <RoleAvatarComponent avatarId={curAvatarId} />
    )}
    <span>{currentRole?.roleName || "旁白"}</span>
  </div>
  
  {/* 下拉菜单 */}
  <div className="dropdown-menu">
    <ExpressionChooser
      roleId={curRoleId}
      handleExpressionChange={setCurAvatarId}
      handleRoleChange={setCurRoleId}
      showNarratorOption={webgalLinkMode}
    />
  </div>
</div>
```

---

### 9. roleChooser.tsx

**作用**：角色选择器组件，用于在聊天中快速切换角色。

**业务流程**：

1. **角色列表**：
   - 从 `RoomContext` 获取用户在该房间拥有的角色列表
   - 或使用传入的 `roles` prop（自定义角色列表）

2. **选择角色**：
   ```typescript
   const handleRoleChange = (role: UserRole) => {
     // 回调给父组件
     onRoleChange(role);
   };
   ```

3. **添加角色**：
   - 仅主持人和管理员可见
   - 点击后打开角色创建窗口

**使用场景**：

- 在 `AvatarSwitch` 中作为下拉菜单内容
- 在 `ExpressionChooser` 中展示角色列表
- 在角色管理界面中选择角色

---

### 10. commandPanel.tsx

**作用**：命令面板，提供骰子命令和 WebGAL 命令的自动补全和帮助。

**业务流程**：

1. **命令模式识别**：
   ```typescript
   export type commandModeType = "dice" | "webgal" | "none";
   
   // 根据前缀判断模式
   if (prefix.startsWith('/')) {
     commandMode = "dice";      // TRPG 骰子命令
   } else if (prefix.startsWith('.')) {
     commandMode = "webgal";    // WebGAL 剧本命令
   }
   ```

2. **命令补全**：
   ```
   用户输入 / 或 . → 显示命令面板 → 输入关键字过滤
                                    ↓
                            显示匹配的命令列表
                                    ↓
                            点击命令插入到输入框
   ```

3. **骰子命令示例**：
   ```
   /r 1d20          - 投掷 1 个 20 面骰子
   /r 3d6+2         - 投掷 3 个 6 面骰子并加 2
   /sc 50           - SAN 值检定（克苏鲁规则）
   /ti 侦查         - 技能检定
   ```

4. **WebGAL 命令示例**：
   ```
   .changeBg:bg1.jpg       - 更改背景
   .changeFigure:char1.png - 显示立绘
   .playBgm:music1.mp3     - 播放背景音乐
   .miniAvatar:show        - 显示小头像
   ```

5. **命令详情显示**：
   ```typescript
   // 当用户输入完整命令时，显示详细信息
   if (prefix.includes(" ")) {
     return (
       <div className="command-detail">
         <div>名称：{command.name}</div>
         <div>描述：{command.description}</div>
         <div>别名：{command.alias.join(", ")}</div>
         <div>用法：{command.usage}</div>
         <div>示例：{command.examples.map(ex => <code>{ex}</code>)}</div>
       </div>
     );
   }
   ```

**命令数据结构**：

```typescript
interface CommandInfo {
  name: string;           // 命令名称
  description: string;    // 命令描述
  alias: string[];        // 命令别名
  usage?: string;         // 使用方法
  examples: string[];     // 示例代码
}
```

---

### 11. roomContext.tsx 和 spaceContext.tsx

**作用**：提供房间和空间级别的 React Context，实现跨组件状态共享。

#### RoomContext 提供的数据：

```typescript
interface RoomContextType {
  // 基础信息
  roomId?: number;                      // 当前房间 ID
  spaceId?: number;                     // 当前空间 ID
  roomMembers: SpaceMember[];           // 房间成员列表
  curMember?: SpaceMember;              // 当前用户的成员信息
  
  // 角色相关
  roomRolesThatUserOwn: UserRole[];     // 用户拥有的角色列表
  curRoleId?: number;                   // 当前选中的角色 ID
  curAvatarId?: number;                 // 当前选中的立绘 ID
  
  // 消息操作
  // 说明：回复/插入这类“临时 UI 状态”已迁移到 zustand（见下方 roomUiStore），
  // RoomContext 主要承载房间/成员/角色/历史消息等领域数据与能力。
  scrollToGivenMessage?: (messageId: number) => void;    // 滚动到指定消息
  
  // WebGAL 联动能力（偏好/模式已迁移到 zustand：roomPreferenceStore）
  jumpToMessageInWebGAL?: (messageId: number) => boolean;  // 在 WebGAL 中跳转
  
  // 历史消息
  chatHistory?: UseChatHistoryReturn;  // IndexedDB 历史消息管理
  
  // 消息渲染更新
  updateAndRerenderMessageInWebGAL?: (message: ChatMessageResponse, regenerateTTS?: boolean) => Promise<boolean>;
}
```

**补充：临时 UI 状态（zustand）**

为了避免 `RoomContext` 因为高频 UI 状态（例如“回复哪条消息”、“插入模式”）变化而触发大量消费者组件重渲染，这两类状态已迁移到 zustand。

- Store 文件：tuan-chat-web/app/components/chat/stores/roomUiStore.ts

```ts
interface RoomUiState {
  replyMessage?: Message;
  insertAfterMessageId?: number;
  setReplyMessage: (message: Message | undefined) => void;
  setInsertAfterMessageId: (messageId: number | undefined) => void;
  reset: () => void;
}
```

**使用示例**：

```ts
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

const replyMessage = useRoomUiStore(s => s.replyMessage);
const setReplyMessage = useRoomUiStore(s => s.setReplyMessage);
```

#### SpaceContext 提供的数据：

```typescript
interface SpaceContextType {
  spaceId?: number;                     // 当前空间 ID
  ruleId?: number;                      // 空间使用的规则 ID
  isSpaceOwner?: boolean;               // 是否为空间所有者
  spaceMembers: SpaceMember[];          // 空间成员列表
  
  // 导航函数
  setActiveSpaceId: (id: number | null) => void;   // 切换空间
  setActiveRoomId: (id: number | null) => void;    // 切换房间
  toggleLeftDrawer: () => void;                    // 切换左侧抽屉
}
```

**使用示例**：

```typescript
import { use } from "react";
import { RoomContext } from "./roomContext";

function MyComponent() {
  const roomContext = use(RoomContext);
  
  // 访问当前房间 ID
  const roomId = roomContext.roomId;
  
  // 访问用户的角色列表
  const roles = roomContext.roomRolesThatUserOwn;
  
  // 调用滚动方法
  roomContext.scrollToGivenMessage?.(messageId);
}
```

---

## WebGAL 联动详解

### realtimeRenderer.ts

**作用**：将聊天消息实时转换为 WebGAL 剧本命令并渲染。

**核心流程**：

```
接收聊天消息 → 解析消息类型和内容 → 转换为 WebGAL 命令
                                      ↓
                              添加到 WebGAL 场景文件
                                      ↓
                              触发 WebGAL 渲染引擎
                                      ↓
                              显示视觉小说效果
```

**消息类型转换规则**：

1. **文本消息**：
   ```typescript
   // 基础格式
   `${roleName}:${content};`
   
   // 带立绘
   `changeFigure:${avatarUrl} -id=${roleId} -position=${position};
    ${roleName}:${content};`
   
   // 带 TTS
   `${roleName}:${content} -voice=${ttsUrl};`
   
   // 对话参数
   `-notend`   // 此话不停顿
   `-concat`   // 续接上段话
   ```

2. **图片消息**：
   ```typescript
   // 普通图片
   `[ͼƬ] -src=${imageUrl};`
   
   // 背景图片
   `changeBg:${imageUrl} -next;`
   ```

3. **特效消息**：
   ```typescript
   switch (effectName) {
     case "clearBackground":
       return "changeBg:none -next;";
     case "none":
       return "pixiInit -next;";  // 清除所有特效
     default:
       return `pixiPerform:${effectName} -next;`;  // rain, snow, sakura
   }
   ```

4. **音频消息**：
   ```typescript
   `playBgm:${audioUrl};`
   ```

**关键方法**：

```typescript
class RealtimeRenderer {
  // 渲染单条消息
  async renderMessage(
    msg: ChatMessageResponse,
    targetRoomId: number,
    syncToFile: boolean = true
  ): Promise<void> {
    // 根据消息类型生成 WebGAL 命令
    const command = this.messageToWebGALCommand(msg);
    // 添加到场景文件
    await this.appendLine(targetRoomId, command, syncToFile);
  }
  
  // 渲染历史消息
  async renderHistory(
    messages: ChatMessageResponse[],
    targetRoomId: number
  ): Promise<void> {
    for (const msg of messages) {
      await this.renderMessage(msg, targetRoomId, false);
    }
    // 一次性同步到文件
    await this.syncToFile(targetRoomId);
  }
  
  // 跳转到指定消息
  jumpToMessage(messageId: number): boolean {
    // 找到消息在场景中的行号
    const lineNumber = this.findMessageLine(messageId);
    if (lineNumber >= 0) {
      // 调用 WebGAL API 跳转
      this.webgalAPI.jumpToLine(lineNumber);
      return true;
    }
    return false;
  }
}
```

**TTS 集成**：

```typescript
// 生成 TTS 音频
async generateTTS(
  text: string,
  roleId: number,
  emotionVector?: number[]
): Promise<string> {
  const response = await fetch('/api/tts/generate', {
    method: 'POST',
    body: JSON.stringify({
      text,
      roleId,
      emotionVector,
    }),
  });
  const { audioUrl } = await response.json();
  return audioUrl;
}

// 在消息中使用 TTS
if (msg.extra?.voiceRenderSettings?.enableTTS) {
  const ttsUrl = await this.generateTTS(
    msg.content,
    msg.roleId,
    msg.extra.voiceRenderSettings.emotionVector
  );
  command += ` -voice=${ttsUrl}`;
}
```

---

## 数据管理

### IndexedDB 历史消息缓存

**文件**：`indexedDB/useChatHistory.ts`

**作用**：使用 IndexedDB 缓存历史消息，实现离线查看和快速加载。

**数据结构**：

```typescript
interface ChatHistoryDB {
  messages: {
    key: number;                    // messageId
    roomId: number;                 // 房间 ID（索引）
    message: ChatMessageResponse;   // 完整消息对象
    timestamp: number;              // 时间戳
  };
}
```

**核心方法**：

```typescript
export interface UseChatHistoryReturn {
  // 加载历史消息
  loadHistory: (roomId: number, limit?: number) => Promise<ChatMessageResponse[]>;
  
  // 添加或更新消息
  addOrUpdateMessage: (message: ChatMessageResponse) => Promise<void>;
  
  // 删除消息
  deleteMessage: (messageId: number) => Promise<void>;
  
  // 清空房间消息
  clearRoomMessages: (roomId: number) => Promise<void>;
  
  // 获取消息数量
  getMessageCount: (roomId: number) => Promise<number>;
}
```

**使用示例**：

```typescript
const chatHistory = useChatHistory();

// 加载最近 100 条消息
const messages = await chatHistory.loadHistory(roomId, 100);

// 添加新消息
await chatHistory.addOrUpdateMessage(newMessage);

// 删除消息
await chatHistory.deleteMessage(messageId);
```

---

## 状态同步机制

### WebSocket 消息类型

```typescript
enum WebSocketMessageType {
  // 聊天消息
  CHAT_MESSAGE = "chat.message",           // 新消息
  MESSAGE_UPDATE = "chat.message.update",  // 消息更新
  MESSAGE_DELETE = "chat.message.delete",  // 消息删除
  
  // 状态同步
  CHAT_STATUS = "chat.status",             // 用户状态（输入中/等待/暂离）
  MEMBER_JOIN = "chat.member.join",        // 成员加入
  MEMBER_LEAVE = "chat.member.leave",      // 成员离开
  
  // 房间管理
  ROOM_UPDATE = "chat.room.update",        // 房间信息更新
  SPACE_UPDATE = "chat.space.update",      // 空间信息更新
}
```

### 状态广播流程

```
用户操作 → 发送 WebSocket 消息 → 服务器验证和处理
                                    ↓
                            广播给房间内所有成员
                                    ↓
                            各客户端接收并更新状态
                                    ↓
                            UI 自动重新渲染
```

**示例：输入状态同步**

```typescript
// 发送输入状态
const sendTypingStatus = (roomId: number, isTyping: boolean) => {
  webSocket.send({
    type: "chat.status",
    roomId,
    status: isTyping ? "input" : "idle",
  });
};

// 接收状态更新
webSocket.on("chat.status", (data) => {
  updateChatStatus(data.roomId, data.userId, data.status);
});
```

---

## 性能优化

### 1. 虚拟滚动

使用 `react-virtuoso` 实现虚拟滚动，大幅减少 DOM 节点数量：

```typescript
<Virtuoso
  data={historyMessages}
  itemContent={(index, message) => (
    <ChatBubble key={message.messageId} message={message} />
  )}
  followOutput="smooth"
  alignToBottom
/>
```

**优势**：
- 仅渲染可见区域的消息
- 支持数万条消息无卡顿
- 自动处理滚动位置

### 2. 消息缓存

使用 IndexedDB 缓存历史消息：

```typescript
// 首次加载从服务器获取
const messages = await fetchMessagesFromServer(roomId);
// 缓存到 IndexedDB
await chatHistory.saveMessages(messages);

// 后续加载从缓存读取
const cachedMessages = await chatHistory.loadHistory(roomId);
```

**优势**：
- 离线查看历史消息
- 快速加载（无需网络请求）
- 减轻服务器压力

### 2.5. GZIP 压缩传输

对于批量获取消息的接口（`getAllMessage`、`getHistoryMessages`），使用 GZIP 压缩来优化带宽传输：

**后端实现**：
```java
@GetMapping("/message/all")
public void getAllMessage(@Valid @RequestParam Long roomId, HttpServletResponse response) throws Exception {
    // 获取消息列表
    List<ChatMessageResponse> messages = chatService.getAllMessage(roomId, uid);
    
    // 将数据转换为JSON并压缩
    String jsonData = objectMapper.writeValueAsString(ApiResult.success(messages));
    
    // 设置响应头
    response.setContentType("application/json;charset=UTF-8");
    response.setHeader("Content-Encoding", "gzip");
    
    // GZIP压缩输出
    try (GZIPOutputStream gzipOutputStream = new GZIPOutputStream(response.getOutputStream())) {
        gzipOutputStream.write(jsonData.getBytes(StandardCharsets.UTF_8));
    }
}
```

**前端处理**：
```typescript
// 浏览器自动处理 gzip 解压，无需额外代码
public getAllMessage(roomId: number): CancelablePromise<ApiResultListChatMessageResponse> {
    return this.httpRequest.request({
        method: 'GET',
        url: '/capi/chat/message/all',
        query: { 'roomId': roomId },
    });
}
```

**优势**：
- 大幅减少网络传输数据量（通常可压缩 70-90%）
- 降低带宽成本
- 提升加载速度，特别是在弱网环境下
- 浏览器原生支持，无需额外依赖
- 完全透明，自动处理压缩和解压

**依赖**：
- 前端：无需额外依赖，浏览器原生支持
- 后端：Java 标准库自带 `java.util.zip.GZIPOutputStream`

### 3. useMemo 优化

使用 `useMemo` 缓存计算结果：

```typescript
// 缓存背景图片节点
const imgNode = useMemo(() => {
  return historyMessages
    .filter(msg => msg.extra?.imageMessage?.background)
    .map((msg, index) => ({ index, imageMessage: msg.extra.imageMessage }));
}, [historyMessages]);

// 缓存特效节点
const effectNode = useMemo(() => {
  return historyMessages
    .filter(msg => msg.extra?.effectMessage)
    .map((msg, index) => ({ index, effectMessage: msg.extra.effectMessage }));
}, [historyMessages]);
```

### 4. 防抖和节流

对于高频操作使用防抖和节流：

```typescript
// 输入状态广播（防抖）
const sendTypingStatus = useDebouncedCallback(
  (isTyping: boolean) => {
    webSocket.send({ type: "chat.status", status: isTyping ? "input" : "idle" });
  },
  300  // 300ms 防抖
);

// 滚动位置更新（节流）
const handleScroll = useThrottledCallback(
  (scrollTop: number) => {
    updateScrollPosition(scrollTop);
  },
  100  // 100ms 节流
);
```

---

## 扩展功能

### 1. sideDrawer（侧边栏）

提供多种侧边栏功能：

- **用户详情**：查看成员信息、权限管理
- **角色详情**：查看角色属性、技能、背景故事
- **搜索**：搜索历史消息
- **先攻追踪**：TRPG 战斗先攻值追踪
- **地图**：显示地图和角色位置
- **导出**：导出聊天记录为 PDF/Markdown
- **WebGAL 预览**：实时预览 WebGAL 渲染效果

### 2. window（弹窗）

提供各种弹窗功能：

- **创建空间**：`createSpaceWindow.tsx`
- **创建房间**：`createRoomWindow.tsx`
- **添加成员**：`addMemberWindow.tsx`
- **房间设置**：`roomSettingWindow.tsx`
- **角色编辑**：`roleEditWindow.tsx`
- **表情选择**：`EmojiWindow.tsx`

### 3. map（地图系统）

提供地图功能：

- 上传和显示地图图片
- 在地图上标记角色位置
- 实时同步角色移动
- 测量距离和范围
- 添加标记和注释

### 4. components（通用组件）

- **messageRenderer**：消息渲染器，支持 Markdown、代码高亮
- **atMentionController**：@ 提及控制器
- **voiceRenderPanel**：TTS 和语音渲染面板

---

## 最佳实践

### 1. 消息发送

```typescript
// ✅ 推荐：使用统一的消息发送函数
const send = useCallback((message: ChatMessageRequest) => {
  // 自动添加时间戳
  message.timestamp = Date.now();
  // 发送到 WebSocket
  webSocket.send(message);
  // 立即添加到本地缓存（乐观更新）
  chatHistory.addOrUpdateMessage(message);
}, [webSocket, chatHistory]);

// ❌ 避免：直接调用 WebSocket
webSocket.send({ roomId, content: "..." });
```

### 2. 状态管理

```typescript
// ✅ 推荐：使用 Context 共享状态
const roomContext = use(RoomContext);
const curRoleId = roomContext.curRoleId;

// ❌ 避免：通过 props 逐层传递
<Component roleId={roleId} avatarId={avatarId} roomId={roomId} ... />
```

### 3. 性能优化

```typescript
// ✅ 推荐：使用 useMemo 缓存计算结果
const filteredMessages = useMemo(() => {
  return messages.filter(msg => msg.status !== 1);
}, [messages]);

// ❌ 避免：每次渲染都计算
const filteredMessages = messages.filter(msg => msg.status !== 1);
```

### 4. 错误处理

```typescript
// ✅ 推荐：优雅的错误处理
try {
  await sendMessage(message);
  toast.success("发送成功");
} catch (error) {
  console.error("发送失败", error);
  toast.error("发送失败，请重试");
  // 回滚本地缓存
  chatHistory.deleteMessage(message.messageId);
}

// ❌ 避免：忽略错误
await sendMessage(message);
```

---

## 常见问题

### 1. 消息发送后不显示

**原因**：WebSocket 未连接或消息未广播

**解决方案**：
1. 检查 WebSocket 连接状态
2. 查看浏览器控制台是否有错误
3. 确认后端已正确处理并广播消息

### 2. 背景/特效不生效

**原因**：消息的 `extra` 字段结构不正确

**解决方案**：
```typescript
// ✅ 正确的结构
{
  extra: {
    effectMessage: {
      effectName: "clearBackground"
    }
  }
}

// ❌ 错误的结构
{
  extra: {
    effectName: "clearBackground"
  }
}
```

### 3. WebGAL 联动不工作

**原因**：
1. 实时渲染未开启
2. WebGAL 进程未启动
3. 消息格式不符合 WebGAL 规范

**解决方案**：
1. 确认工具栏中的 WebGAL 图标已激活
2. 检查 WebGAL 服务是否运行（端口 9000）
3. 查看 RealtimeRenderer 的日志

### 4. 历史消息加载慢

**原因**：未使用 IndexedDB 缓存

**解决方案**：
```typescript
// 启用历史消息缓存
const chatHistory = useChatHistory();
await chatHistory.loadHistory(roomId, 100);
```

---

## 未来规划

### 短期（1-2 个月）

- [ ] 消息编辑功能
- [ ] 消息引用（quote）
- [ ] 富文本编辑器（Markdown、代码块、表格）
- [ ] 消息已读回执
- [ ] 语音消息
- [ ] 视频消息

### 中期（3-6 个月）

- [ ] 端到端加密
- [ ] 消息搜索优化（全文搜索、正则）
- [ ] AI 辅助 DM（根据剧情自动生成描述）
- [ ] 自定义表情包
- [ ] 消息置顶
- [ ] 消息收藏

### 长期（6-12 个月）

- [ ] 移动端原生应用
- [ ] 离线模式（PWA）
- [ ] 多语言支持
- [ ] 主题定制
- [ ] 插件系统
- [ ] API 开放平台

---

## 贡献指南

如需为 Chat 模块贡献代码，请遵循以下规范：

1. **代码风格**：遵循项目的 ESLint 和 Prettier 配置
2. **类型安全**：所有组件必须有完整的 TypeScript 类型
3. **测试覆盖**：新功能需要编写单元测试和集成测试
4. **文档更新**：修改代码后同步更新本文档
5. **提交规范**：使用语义化提交消息（Conventional Commits）

---

## 技术栈

- **React 18**：使用 `use` Hook 和并发特性
- **TypeScript**：完整的类型定义
- **React Router**：路由管理
- **TanStack Query**：数据获取和缓存
- **Zustand**：轻量级状态管理
- **react-virtuoso**：虚拟滚动
- **IndexedDB**：本地数据库
- **WebSocket**：实时通信
- **DaisyUI**：UI 组件库
- **Tailwind CSS**：样式框架

---

## 联系方式

如有问题或建议，请联系：

- 项目负责人：[待补充]
- 技术支持：[待补充]
- GitHub Issues：[待补充]

---

**最后更新**：2025年12月10日
**文档版本**：v1.0.0

---

## Steipete 观点驱动的重构记录（2026-02-01）

参考来源：Peter Steinberger "Building a sustainable codebase: 7 years and counting"（Speaker Deck）

原则对照

1. Boring Is Good / Technology Choices：不引入新依赖，优先拆分现有组件、提炼 hooks。
2. Refactoring：通过拆分 UI 片段和拖拽逻辑降低单文件复杂度。
3. Hacks：减少 JSX 内联复杂逻辑，改为显式函数/小组件，降低“临时补丁”式改动。
4. Code Reviews / Code Formatting：结构清晰、命名明确，方便审阅；保持现有格式规范。
5. Tests & Continuous Integration：本次为结构重构，无行为变更；暂未新增测试（后续可补 UI 回归测试）。
6. Saying No to Features：不新增功能，只做结构整理。

变更说明（逐条）

- `app/components/chat/chatFrame.tsx`: 抽离“旁白切换”和“添加表情”到 hooks，减少主组件职责。
  - 新增 `app/components/chat/hooks/useChatFrameNarratorToggle.tsx`
  - 新增 `app/components/chat/hooks/useChatFrameEmojiActions.ts`
- `app/components/chat/chatFrameList.tsx`: 拆分为小组件与拖拽处理 hook：
  - `DocRefDragOverlay`：文档拖拽遮罩（shared/components + roomDocRefDropLayer 统一）
  - `SelectionToolbar`：批量操作条
  - `UnreadIndicator`：未读提示按钮
  - `useChatFrameListDragHandlers`：集中 drag/drop 逻辑
- `app/components/chat/hooks/useChatFrameMessageRenderer.tsx`：封装消息渲染回调，减少 `ChatFrame` 中的内联渲染逻辑。
- `app/components/chat/hooks/useChatFrameMessageMutations.ts`：集中处理删除/更新消息的本地同步逻辑。
- `app/components/chat/hooks/useChatFrameSelectionContext.ts`：聚合选择态、右键菜单与点击处理，降低 `ChatFrame` 复杂度。
- `app/components/chat/hooks/useChatFrameIndexing.ts`：集中处理虚拟列表索引映射，减少组件内计算。
- `app/components/chat/hooks/useChatFrameWebSocket.ts`：封装 WebSocket 工具访问，集中 send/未读计数/同步状态。
- `app/components/chat/chatFrameView.tsx`：集中页面组合渲染，保持 `ChatFrame` 只负责数据与绑定。
- `app/components/chat/chatFrameLoadingState.tsx`：抽离加载态 UI，减少主组件 JSX。
- `app/components/chat/hooks/useChatFrameOverlayState.ts`：集中管理转发/导出弹窗状态。

参考链接

- https://speakerdeck.com/steipete/building-a-sustainable-codebase-7-years-and-counting









