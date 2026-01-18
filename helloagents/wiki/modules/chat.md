# chat

## 目的

承载“空间/房间聊天”业务：消息流、房间资料、侧边栏分类（sidebarTree）、跑团指令与各类业务面板。

## 模块概述

- **职责:** Chat 页面与布局、房间列表与分类、消息渲染与发送、房间资料与文档入口、跑团相关交互
- **状态:** ?开发中
- **最后更新:** 2026-01-18

## 入口与目录

- 主要目录：`app/components/chat/`
- 关键路由：
  - `/chat/:spaceId/:roomId`：房间聊天页
  - `/chat/:spaceId/trpg`：跑团设置页（空间规则与骰娘配置）
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
- “跑团设置”从空间资料中拆分，集中管理空间规则与骰娘配置，成员可见、空间拥有者可编辑。

### 3) 跑团指令：检定请求按钮消息

- 使用独立消息类型：`COMMAND_REQUEST(12)`（与后端枚举对齐）
- KP 发送包含 `@All` 的指令会生成“检定请求”卡片；成员点击后以自身角色在原 thread 执行该指令

## 相关文档

- 项目概览：[overview](../overview.md)
- app 模块（含 Chat/Blocksuite 集成事实来源）：[app](app.md)
- Blocksuite 集成：[blocksuite](blocksuite.md)
- Blocksuite 依赖与坑位：[vendors/blocksuite](../vendors/blocksuite/index.md)
