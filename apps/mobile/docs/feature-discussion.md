# 移动端功能讨论记录

## 功能列表与决策

### 1. [高] 私聊/好友

**范围：** 全部功能

- 好友列表（查看、添加、删除、搜索用户）
- DM 历史消息
- 发起私聊对话

**当前进度：** 已实现基础 DM 对话列表（左侧抽屉 DM 模式），使用 `messageDirectController.getInboxMessages()` 获取收件箱。

**待完成：**
- 好友管理（添加/删除/搜索）
- 完整 DM 聊天界面（发送私聊消息）

---

### 2. [高] 角色管理

**范围：** 全部功能

- 查看用户自己的所有角色（跨空间的个人角色库）
- 编辑角色名/简介
- 换头像
- 创建新角色

**当前进度：** 角色 tab 已改为显示用户个人角色库（普通角色 + 骰娘），使用 `roleController.getUserRolesByType(userId, type)` API。

**待完成：**
- 角色编辑功能（修改名称、简介）
- 角色头像上传/更换
- 创建新角色

**API：**
- `GET /role/user/type` → `getUserRolesByType(userId, type)` — 按类型获取用户角色
- `GET /role/user` → `getUserRoles(userId)` — 获取用户所有角色

---

### 3. [高] 消息编辑/删除

**范围：** 长按消息操作菜单，包含：回复、复制、编辑（仅自己的消息）、删除（仅自己的消息）

**当前进度：** 已实现 `MessageActionMenu` 底部弹窗，支持 reply/copy/edit/delete。

**待完成：** 功能已基本完成。

---

### 4. [中] Message Annotation（消息标注）

**范围：** 和 web 端保持一致

**重要说明：** 这不是简单的 emoji 反应，而是 WebGAL 演出标注系统。

**Web 端实现：**
- 标注存储为 `annotations: string[]`，在 Message 模型上
- 90+ 内置标注，按分类组织：
  - **Audio:** BGM、音效
  - **Images:** CG、背景、展示
  - **Figure/Character:** 立绘（左/中/右位置 + 动画）
  - **Effects:** 14 种特效（雨、雪、樱花等）
  - **Control:** dialog.notend, dialog.concat, dialog.next, video.skipoff
- 标注选择器：分类浏览 + 使用频率排序
- 标注持久化：IndexedDB 按 `roomId:roleId` 存储
- 消息发送时携带 annotations 字段
- 消息气泡下方显示标注条（chips）

**移动端实现计划：**
- 复用 web 端的标注目录定义（annotationCatalog）
- 实现标注选择器（BottomSheet 形式）
- Composer 中显示当前标注条
- 消息项下方显示标注 chips
- 按 roomId:roleId 持久化标注偏好（AsyncStorage）

**API：**
- `PUT /chat/message` → `updateMessage(message)` — 更新消息标注
- `POST /chat/message` → 发送时携带 `annotations` 字段

---

### 5. [中] 消息搜索

**范围：** 本地搜索（搜索已加载的消息）

**重要修复：** 消息拉取逻辑有问题。

**问题：** 当前使用 `POST /chat/message/page`（游标分页），但应该使用 `GET /chat/message/all` 一次拉取所有消息。

**Web 端做法：** 使用 `getAllMessage(roomId)` 一次性获取所有消息（gzip 压缩），staleTime: 0。

**修复计划：**
- 将 `useRoomMessagesInfiniteQuery`（分页）改为 `useRoomMessagesQuery`（一次全量拉取）
- 使用 `chatController.getAllMessage(roomId)` API
- 本地搜索在已拉取的全量消息中进行关键词匹配

**API：**
- `GET /chat/message/all?roomId=xxx` → `getAllMessage(roomId)` — 获取房间所有消息

---

### 6. [中] 用户资料

**范围：** 现有实现已足够

**当前进度：** 已实现个人资料查看/编辑（用户名、简介、性别）+ 通知列表。

**不需要额外功能。**

---

### 7. [中] 通知设置

**范围：** 通知收件箱 + 通知偏好设置 + 本地推送

**当前进度：** 已实现通知列表 + 未读数 + 全部已读。

**待完成：**
- 通知偏好设置（开关各类通知）
- **Android 本地推送机制**（Firebase Cloud Messaging / expo-notifications）
- **iOS 本地推送机制**（APNs / expo-notifications）
- 后台消息到达时触发本地通知

**技术方案：**
- 使用 `expo-notifications`（已在 package.json 中）
- Android: FCM channel 配置
- iOS: APNs 权限请求 + badge 管理
- 前台时不弹通知，后台/锁屏时弹本地通知

**API：**
- `GET /notification/unread/count` — 未读数
- `POST /notification/page` — 通知列表
- `POST /notification/read` — 批量标记已读
- `POST /notification/read-all` — 全部已读

---

### 8. [低] 富文本编辑

**范围：** 和 web 端保持一致

**Web 端实现：**
- 使用 contentEditable div（非第三方富文本库）
- 自定义 WebGAL 文本增强语法：`[text](params)`
- 支持格式：
  - 加粗、斜体、下划线
  - 3 级标题
  - 文字颜色（预设调色板 + 自定义）
  - 背景色
  - 字号（80%~200%）
  - Ruby 注音（日文/中文）
  - 高级样式：字间距、透明度、文字阴影等
- @提及：输入 `@` 触发自动补全，选择角色后插入 `<span data-role="...">` 
- 消息发送时提取：plainText（含语法标记）+ mentionedRoles（被提及的角色列表）

**移动端实现计划：**
- TextInput 基础输入 + 格式化工具栏
- 支持基础格式：加粗、斜体、颜色、字号
- @提及：输入 `@` 弹出角色列表 BottomSheet，选择后插入标记
- 消息渲染：解析 WebGAL 语法 `[text](params)` 并应用样式
- 语法解析复用 web 端的 `parseTextEnhanceSegments()` 逻辑

**语法示例：**
```
[加粗文字](style-alltext=font-weight:bold\;)
[红色文字](style=color:#FF0000)
[注音文字](ruby=ふりがな)
```

---

## 实施优先级

1. **修复消息拉取逻辑** — 改为 `getAllMessage` 全量拉取（影响所有后续功能）
2. **Message Annotation** — 标注系统（和 web 端一致）
3. **角色管理完善** — 编辑/创建/头像
4. **私聊/好友完善** — 好友管理 + 完整 DM 聊天
5. **本地推送** — Android + iOS 推送机制
6. **本地消息搜索** — 基于全量消息的关键词搜索
7. **富文本编辑** — WebGAL 语法支持 + @提及
8. **通知偏好设置** — 推送开关配置
