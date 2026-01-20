# chat

## 目的

承载“空间/房间聊天”业务：消息流、房间资料、侧边栏分类（sidebarTree）、跑团指令与各类业务面板。

## 模块概述

- **职责:** Chat 页面与布局、房间列表与分类、消息渲染与发送、房间资料与文档入口、跑团相关交互
- **状态:** ?开发中
- **最后更新:** 2026-01-20

## 入口与目录

- 主要目录：`app/components/chat/`
- 关键路由：
  - `/chat/:spaceId/:roomId`：房间聊天页
  - `/chat/:spaceId/:roomId/setting`：房间资料页（含 Blocksuite 文档）
  - `/chat/:spaceId/doc/:docId`：独立文档页（保留侧边栏）

## 核心概念（约定）

- **spaceId / roomId**：聊天空间与房间标识
- **threadId**：消息线程（回复/引用等按 thread 聚合）
- **sidebarTree**：侧边栏分类树（后端持久化 + 本地 UI 状态）
- **业务文档（Blocksuite）**：空间资料/房间资料/独立文档统一走 Blocksuite 集成（iframe 强隔离为默认策略）

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

- 入口位于聊天输入区工具栏：支持选择 `.txt` 文件或粘贴文本
- 解析规则：每行一条消息，格式为 `[角色名]：对话内容`（支持中文/英文冒号）
- 角色映射：优先按“角色名精确匹配”自动映射；无法唯一匹配时要求用户手动指定映射后再发送
- KP 可选择“旁白（roleId=-1）”作为导入目标
- 若发言人映射为“骰娘（系统）”，发送时会解析实际骰娘角色并按 `DICE(6)` 类型发送（`extra.result=content`）
- 若当前房间无可用角色（非KP），导入弹窗提供“创建/导入角色”快捷入口

### 5) 房间角色：NPC+ 快速创建

- KP 在“角色列表”点击 `NPC+` 可直接创建 NPC，并自动加入当前房间
- 创建时会同步加入“空间 NPC 库”，方便后续在其它房间复用

## 相关文档

- 项目概览：[overview](../overview.md)
- app 模块（含 Chat/Blocksuite 集成事实来源）：[app](app.md)
- Blocksuite 集成：[blocksuite](blocksuite.md)
- Blocksuite 依赖与坑位：[vendors/blocksuite](../vendors/blocksuite/index.md)

## 变更历史

- [202601201337_chat_import_text](../../history/2026-01/202601201337_chat_import_text/) - 新增聊天室文本导入（txt → 多条消息，按角色名映射发送）
- [202601201620_chat_import_dicer](../../history/2026-01/202601201620_chat_import_dicer/) - 文本导入支持“骰娘”发言：按骰娘角色发送并使用 `DICE(6)` 类型
