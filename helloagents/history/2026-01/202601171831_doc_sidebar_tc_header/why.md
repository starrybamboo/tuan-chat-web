# 变更提案: sidebarTree 文档 tcHeader（标题/封面）一致化

## 需求背景

当前 sidebarTree 中的“文档”打开后仍在使用 Blocksuite 原生标题头（`doc-title`），与房间/空间描述文档的 `tc_header`（图片+标题）交互不一致，且无法在侧边栏列表项中展示文档封面信息。

## 变更内容

1. 文档打开页启用 `tcHeader`（`tc_header.title` + `tc_header.imageUrl`），并移除 Blocksuite 原生标题头。
2. 标题与封面变更可同步到侧边栏文档列表项展示（缩略图 + 标题）。
3. 保持“文档”与“聊天室/房间”的视觉区分（文档缩略图保留文档标识）。

## 影响范围

- **模块:** Chat（文档主视图 / 侧边栏列表）
- **文件:**
  - `app/components/chat/chatPage.tsx`
  - `app/components/chat/room/chatRoomListPanel.tsx`
  - `app/components/chat/stores/docHeaderOverrideStore.ts`
- **API:** 无
- **数据:** 新增本地 localStorage 缓存键（不改动后端 schema）

## 核心场景

### 需求: 文档头部一致化
**模块:** Chat
文档打开后，呈现与房间描述一致的 `tc_header`（标题输入 + 图片上传），不再显示 Blocksuite 内置标题。

#### 场景: 打开文档并查看头部
- 条件：从 sidebarTree 点击任意“文档”
- 预期结果：顶部出现 `tc_header`；不出现 Blocksuite 原生 `doc-title`

#### 场景: 修改标题后同步到列表
- 条件：在 `tc_header` 输入标题
- 预期结果：侧边栏文档条目标题同步更新

#### 场景: 上传/更换图片后同步到列表
- 条件：在 `tc_header` 上传图片
- 预期结果：侧边栏文档条目显示该图片缩略图（并保留文档标识以区别房间）

## 风险评估

- **风险:** 仅依赖本地缓存展示封面可能导致“未打开过的旧文档”侧边栏不显示封面
- **缓解:** 侧边栏仍保留文档 icon 兜底；后续如需要全量展示可再引入批量读取 `tc_header` 的策略
