# privateChat（私聊/好友）模块

该目录承载私聊与好友相关 UI（被 `chat/chatPage.tsx` 复用）。

## 目录结构

- `FriendsPage.tsx`：好友页（全部/待处理/添加好友，支持用户ID或用户名搜索）。
- `LeftChatList.tsx`：私聊模式下左侧列表面板（好友入口 + 会话列表 + 通用右键菜单）。
- `RightChatView.tsx`：私聊模式下右侧聊天窗口（顶部信息 + 消息窗口 + 输入框 + 右键菜单）。
- `components/`：私聊子组件（列表项、消息气泡、输入框、右键菜单等）。
- `hooks/`：私聊相关 hooks（列表/收发/滚动/未读等）。
- `types/`：私聊领域类型（如 `MessageDirectType`）。

## 使用方式（路由）

- 好友页：`/chat/private`
- 私聊：`/chat/private/:roomId`（目前 `roomId` 语义为对方用户 id）

> 入口渲染由 `chat/chatPage.tsx` 根据 `urlSpaceId === 'private'` 决定。
