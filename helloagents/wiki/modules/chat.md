# chat

## 目的

承载“空间/房间聊天”业务：消息流、房间资料、侧边栏分类（sidebarTree）、跑团指令与各类业务面板。

## 模块概述

- **职责:** Chat 页面与布局、房间列表与分类、消息渲染与发送、房间资料与文档入口、跑团相关交互
- **状态:** ?开发中
- **最后更新:** 2026-01-23


## 入口与目录

- 主要目录：`app/components/chat/`
- 关键路由：
  - `/chat/:spaceId/:roomId`：房间聊天页
  - `/chat/:spaceId/:roomId/setting`：房间资料页（含 Blocksuite 文档）
  - `/chat/:spaceId/doc/:docId`：独立文档页（保留侧边栏）
- 关键 UI：
  - `SpaceDetailPanel`（空间抽屉面板）：支持 `members/workflow/trpg/setting` 四类 tab；其中 `trpg` 对应 `SpaceTrpgSettingWindow`（空间规则/空间骰娘）

## 核心概念（约定）

- **spaceId / roomId**：聊天空间与房间标识
- **threadId**：消息线程（回复/引用等按 thread 聚合）
- **sidebarTree**：侧边栏分类树（后端持久化 + 本地 UI 状态）
- **业务文档（Blocksuite）**：空间资料/房间资料/独立文档统一走 Blocksuite 集成（iframe 强隔离为默认策略）

### 需求: 拖拽时自动上下滚动
**模块:** chat
拖拽消息靠近列表顶部/底部时，列表应自动滚动；离开触发区或结束拖拽后停止。

#### 场景: 指针进入顶部或底部触发区
前置条件:
- 用户在聊天消息列表中拖拽消息。
- 指针接近列表顶部或底部触发区。

- 预期结果:
  - 顶部触发区：列表持续向上滚动。
  - 底部触发区：列表持续向下滚动。
  - 离开触发区或拖拽结束时停止滚动。

### 需求: 聊天气泡文本选区保持
**模块:** chat
聊天消息文本选中后，松开鼠标应保留选区，不触发消息跳转或多选。

#### 场景: 松开鼠标仍保留
前置条件:
- 用户在消息气泡文本区域拖拽选择文本。
- 松开鼠标完成选择。

- 预期结果:
  - 选区保持可复制。
  - 不触发消息跳转或多选。

## 关键流程速记

### 1) 侧边栏分类（sidebarTree）

- 后端持久化：`/space/sidebarTree`（带 `version` 的乐观锁写入）
- UI 状态（展开/折叠）：仅本地 IndexedDB 保存，不回写后端树结构
- 文档元信息（doc metas）回补：当 Blocksuite workspace 的 docMetas 不足时，从 sidebarTree 的 doc 节点回补，确保文档节点可见/可打开

### 2) 房间资料 / 文档入口

- “房间资料”通常是 Chat 内的一个业务面板，但其正文编辑统一走 Blocksuite 文档（见 blocksuite 模块文档）。

### 3) 跑团指令：检定请求按钮消息

- 使用独立消息类型：`COMMAND_REQUEST(12)`（与后端枚举对齐）
- KP 发送包含 `@All` 的指令会生成“检定请求”卡片；成员点击后以自身角色在原 thread 执行该指令

### 4) 文本导入：txt → 多条聊天消息

- 入口位于房间顶部“聊天记录”下拉（导入/导出合并入口）：支持选择 `.txt` 文件或粘贴文本
- 解析规则：每行一条消息，格式为 `[角色名]：对话内容`（支持中文/英文冒号）
- 角色映射：优先按“角色名精确匹配”自动映射；无法唯一匹配时要求用户手动指定映射后再发送
- 导入消息会写入 `message.webgal.customRoleName`，显示时保留导入文本中的发言人名
- KP 可选择“旁白（roleId=-1）”作为导入目标
- 若发言人映射为“骰娘（系统）”，发送时会解析实际骰娘角色并按 `DICE(6)` 类型发送（`extra.result=content`）
- 立绘位置：可为每个发言人选择左/中/右位置，导入发送时写入 `message.webgal.voiceRenderSettings.figurePosition`
- 若当前房间无可用角色（非KP），导入弹窗提供“创建/导入角色”快捷入口
- 导入弹窗 UI：双栏卡片分区、消息预览、缺失角色高亮与快捷引导

### 5) 房间角色：NPC+ 快速创建

- KP 在“角色列表”点击 `NPC+` 打开“创建NPC”弹窗（复用角色创建流程），创建完成后自动加入当前房间
- 创建时通过 `type=2 + spaceId` 绑定空间，后端会自动将其纳入“空间 NPC 库”，方便后续在其它房间复用（也可从 NPC 库导入）
- 点击角色头像弹窗：默认复用角色页面详情（CharacterDetail）；在房间上下文中保留“踢出角色”等权限操作
- 角色列表头像展示：优先使用角色 avatarId；缺失时取该角色头像列表首个头像作为展示兜底（仅前端显示）
- 删除房间角色：KP 可在角色头像详情中将 NPC/角色从当前房间移除
- 获取“我的角色”：前端改用 `GET /role/user/type`（分别取 type=0/1），不再从 `/role/user` 拉取后再前端过滤

## 相关文档

- 项目概览：[overview](../overview.md)
- app 模块（含 Chat/Blocksuite 集成事实来源）：[app](app.md)
- Blocksuite 集成：[blocksuite](blocksuite.md)
- Blocksuite 依赖与坑位：[vendors/blocksuite](../vendors/blocksuite/index.md)

## 变更历史

- 2026-01-24 空间列表按钮悬停提示改为自定义浮层，避免超出容器被截断
- 2026-01-23 修复聊天消息文本选区松开后丢失
- 2026-01-23 修复拖拽离开消息列表时无法继续自动滚动的问题
- 2026-01-23 修复拖拽自动滚动回调依赖顺序导致运行时报错
- 2026-01-23 修复拖拽自动滚动重复声明导致构建失败
- [202601232052_chat_import_preserve_speaker_name](../../history/2026-01/202601232052_chat_import_preserve_speaker_name/) - 聊天导入保留原发言人名
- [202601232052_chat_text_selection](../../history/2026-01/202601232052_chat_text_selection/) - 聊天气泡文本选区保持
- [202601231857_chat-drag-auto-scroll](../../history/2026-01/202601231857_chat-drag-auto-scroll/) - 拖拽移动消息时支持顶部/底部自动滚动

- [202601231851_role_avatar_fallback](../../history/2026-01/202601231851_role_avatar_fallback/) - 房间角色导入头像兜底显示（avatarId 为空时取首个头像）
- [202601201337_chat_import_text](../../history/2026-01/202601201337_chat_import_text/) - 新增聊天室文本导入（txt → 多条消息，按角色名映射发送）
- [202601201620_chat_import_dicer](../../history/2026-01/202601201620_chat_import_dicer/) - 文本导入支持“骰娘”发言：按骰娘角色发送并使用 `DICE(6)` 类型
- [202601211623_chat_import_figure_position](../../history/2026-01/202601211623_chat_import_figure_position/) - 文本导入支持为发言人设置立绘位置（左/中/右）
- [202601211700_chat_import_ui_refine](../../history/2026-01/202601211700_chat_import_ui_refine/) - 文本导入弹窗 UI 重构：双栏布局、预览、缺失映射提示与快捷创建入口

## ????
- ??????????? roleId?????????????
- ????????????? roleId ??????????
