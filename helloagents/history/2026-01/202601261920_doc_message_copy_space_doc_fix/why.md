# why

## 问题

- 当前侧边栏文档已切换为后端 `space_doc` 管理，sidebarTree 仅保存引用（docId 形如 `sdoc:<id>:description`）。
- 之前“复制到空间侧边栏”错误地创建了 `space_user_doc`（`udoc:*`）并写入 sidebarTree，导致侧边栏不展示/不更新。

## 目标

- “复制到空间侧边栏”改为创建 `space_doc`，并将新 `sdoc:*` 引用追加到 sidebarTree 的 `cat:docs`。

