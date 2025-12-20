# Chat Thread（Discord 风格）前端 UI 说明

## 目标
- **已发出的消息不会被“转化”为 Thread**。
- 创建 Thread 时，会在主消息流新增一条 **Thread Root 消息**（`messageType = 10001`，即 `THREAD_ROOT`）。
- Thread 内回复消息（`threadId != null && threadId != messageId`）不在主消息流展示，仅在右侧子区面板聚合查看。

## 入口
- 在任意消息上 **右键**，选择：
  - `创建子区`：若该消息尚无子区，则发送一条 `THREAD_ROOT` 根消息（服务端落库后 `threadId = messageId`）。
  - `打开子区`：若已存在子区，则直接打开对应的子区面板。

> 说明：消息气泡上不提供 Thread 按钮入口。

## 主消息流展示（THREAD_ROOT）
- `THREAD_ROOT` 在主消息流中以提示条样式展示：
  - “{创建者} 开始了一个子区：{title} · 查看所有子区”
  - 下方展示子区标题与“X 条消息”摘要
- 点击提示条或“查看所有子区”会打开右侧子区面板，并将输入目标切换到子区。

## 数据约定
- `threadId`：Thread Root 的 `messageId`
  - Root：`threadId == messageId`
  - Reply：`threadId == rootId && messageId != rootId`
- Root 与原消息关联复用 `replyMessageId`（请求时使用 `replayMessageId`）。
- `extra.title`：Thread 标题（前端默认取原消息内容截断，不增加 `Thread:` 前缀）。
