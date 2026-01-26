# 技术设计: 文档消息拖拽复制到侧边栏

## 复用协议
- 拖拽数据统一复用 `docRef` 协议：
  - 自定义 MIME：`application/x-tc-doc-ref`
  - 兜底：`text/uri-list` / `text/plain`（`tc-doc-ref:<docId>`）

## 拖拽源（聊天列表）
- 在 `DocCardMessage` 上启用 `draggable`，`dragstart` 时写入 docRef payload（docId/spaceId/title/imageUrl）。

## 拖拽目标（sidebarTree）
- 在 `ChatRoomListPanel` 的分类容器上监听 `dragover/drop`：
  - `dragover`：检测 `isDocRefDrag`，显示“松开复制到侧边栏”的投放提示。
  - `drop`：读取 `getDocRefDragData`，校验 spaceId 与权限后执行复制。

## 复制实现
- 抽出可复用工具 `app/components/chat/utils/docCopy.ts`：
  - `getDocUpdateForCopy`：优先用远端快照恢复源 doc，再从本地 workspace 导出 full update。
  - `copyDocToSpaceDoc`：创建 `/space/doc`，restore 到目标 doc，并把最终 full update 写回远端快照（`space_doc`）。
- `ChatFrameContextMenu` 复用 `copyDocToSpaceDoc`，避免复制逻辑分叉。

## 一致性与展示
- 侧边栏新增节点写入 `fallbackTitle/fallbackImageUrl`，确保首屏即时可见。
- 为避免 docMetas 尚未刷新导致 sidebarTree normalize 丢节点，drop 时通过 `docMetasOverride` 保持新 doc 节点可见，并补充本地 `extraDocMetas`。

## 验证
- 手动：
  - 拖拽文档卡片到 sidebarTree：新增节点 + toast 成功提示
  - 打开新文档：正文存在
  - 跨空间/非 KP：提示并不执行复制

