# 变更提案: 房间列表标题对齐 tc_header

## 需求背景
当前房间列表仍显示 Untitled，占位标题未被替换；业务标题已存储在房间描述文档的 tc_header 中，但列表仍依赖 room.name，导致显示不一致。

## 变更内容
1. 房间列表在 room.name 为空或为 Untitled 时，优先使用 room 描述文档的 tc_header 标题（来自 doc meta / override）
2. 文档节点将 Untitled 视为占位，回退到业务标题或 fallback

## 影响范围
- 模块: app/components/chat/room
- 文件: app/components/chat/room/chatRoomListPanel.tsx
- API: 无
- 数据: 无

## 核心场景

### 需求 房间列表标题使用 tc_header
**模块:** Chat/Room List
房间名称未同步或为 Untitled 时，列表应展示房间描述文档的 tc_header 标题。

#### 场景: 列表渲染
前置条件: 房间描述文档已写入 tc_header.title
- 预期结果: 房间列表显示 tc_header.title
