# 怎么实现（方案与步骤）

## 1) sidebarTree 后端读写补齐

- `ChatPage` 使用 `useGetSpaceSidebarTreeQuery` 拉取 `treeJson/version`，用 `parseSidebarTree` 解析后传给 `ChatRoomListPanel`。
- `ChatRoomListPanel` 内部编辑通过 `onSaveSidebarTree` 回传，`ChatPage` 用 `useSetSpaceSidebarTreeMutation`（带 `expectedVersion`）写回后端。

## 2) 新增分类展开“闪回”修复

- `ChatRoomListPanel` 清理展开状态时，改为基于“当前渲染树”（`localTree ?? displayTree`）的分类集合，避免误删本地新分类的展开 key。

## 3) 重置默认补齐后端请求

- `ChatPage` 实现 `resetSidebarTreeToDefault`，生成默认树并 `PUT /space/sidebarTree`。
- 将回调透传给 `ChatRoomListPanel` 的按钮。

## 4) 分类右侧“+”创建入口

- 移除底部“创建房间”按钮。
- 分类标题右侧新增“+”，点击弹窗（样式参考“生成邀请链接”区域），可选择创建房间/文档。
- 创建成功后，将对应节点追加到目标分类并写回 `/space/sidebarTree`。

## 5) 文档在 Chat 布局内打开

- 复用 Chat 路由：当 `roomId === "doc"` 时，将 `messageId` 作为 `docId` 使用：`/chat/:spaceId/doc/:docId`。
- `ChatPage` 主视图区渲染文档编辑器（保留侧边栏），并在侧边栏高亮当前文档节点。

