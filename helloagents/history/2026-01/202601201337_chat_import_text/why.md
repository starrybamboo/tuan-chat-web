# 变更提案: 聊天室文本导入（txt → 多条消息）

## 需求背景

用户会提供一份 `.txt` 文本脚本，内容按行记录对话（如 `[角色名]：对话内容`）。希望在聊天室内“一键导入”，自动拆分为多条消息并按角色发送，减少手工复制粘贴的成本与出错概率。

## 变更内容

1. 在聊天输入区提供“导入文本”入口（支持选择 `.txt` 文件或直接粘贴文本）。
2. 解析文本为多条消息（每行一条），并提取说话人（`[角色名]`）与内容。
3. 根据说话人名称自动匹配当前用户在该房间可用的角色；无法唯一匹配时提示用户手动指定映射后再发送。

## 影响范围

- **模块:** `chat`
- **文件:**
  - `app/components/chat/room/roomWindow.tsx`
  - `app/components/chat/room/roomComposerPanel.tsx`
  - `app/components/chat/input/chatToolbar.tsx`
  - `app/components/chat/input/chatToolbarFromStore.tsx`
  - `app/components/chat/window/importChatMessagesWindow.tsx`
  - `app/components/chat/utils/importChatText.ts`
  - `app/components/chat/utils/importChatText.test.ts`
- **API:** 无新增 API；复用现有 `sendMessage` 发送逻辑
- **数据:** 无

## 核心场景

### 需求: 导入外部对话文本为消息流
**模块:** chat

#### 场景: 自动解析与角色匹配
- 给定文本内容，每行形如 `[角色名]：对话内容`（支持英文/中文冒号）。
- 系统将有效行解析为消息列表，并自动尝试将 `[角色名]` 匹配到用户在该房间的可用角色。
- 若某个角色名无法唯一匹配，系统要求用户在弹窗内手动选择对应角色后才允许开始导入。

#### 场景: 顺序发送并反馈进度
- 用户确认后，系统按原文本顺序依次发送多条文本消息。
- 发送过程中展示进度，完成后提示导入成功。

## 风险评估

- **风险:** 导入文本格式不规范导致误解析或遗漏
  - **缓解:** 提示支持格式、统计无效行数量并允许用户修正；无效行不会发送
- **风险:** 频繁发送导致短时间内消息过密
  - **缓解:** 大批量导入时对发送做轻量节流（短延迟）

