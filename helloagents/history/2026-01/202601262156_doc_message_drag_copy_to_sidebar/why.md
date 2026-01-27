# 变更提案: 文档消息拖拽复制到侧边栏

## 需求背景
已支持发送“文档卡片消息”（只读预览的引用）。为了提升复用效率，希望在聊天消息列表中对“文档卡片消息”支持拖拽，并可将其拖入侧边栏（sidebarTree）自动复制为一份新的空间文档（space_doc）。

## 目标与约束
- **目标:** 聊天列表里的文档卡片可拖拽到侧边栏，松开后完成“复制（copy）”语义并在侧边栏出现新文档节点。
- **只读预览:** 文档卡片本身仍为引用 + 预览（只读）。
- **复制语义:** 侧边栏得到的是新文档（space_doc），正文内容需完整复制（包含 Blocksuite 快照）。
- **权限:** 仅 KP 可写侧边栏；非 KP 不应触发复制流程。
- **空间限制:** 不允许跨 space 复制。

## 影响范围
- 模块: `chat`
- 文件:
  - `app/components/chat/message/docCard/docCardMessage.tsx`
  - `app/components/chat/room/chatRoomListPanel.tsx`
  - `app/components/chat/utils/docCopy.ts`
  - `app/components/chat/room/contextMenu/chatFrameContextMenu.tsx`

## 验收标准
- 聊天消息列表中的文档卡片可被拖拽。
- 将文档卡片拖到左侧 sidebarTree 任意分类区域可出现投放提示，松开后提示成功，并新增一个文档节点。
- 新建文档打开后正文不丢失（copy 完整快照）。
- 触发跨 space 时拦截并提示。
- 非 KP 拖拽到侧边栏不触发复制（无权限提示）。

