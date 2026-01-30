# 变更提案: Chat 发现页（已归档群聊列表）

## 需求背景

当前“空间（群聊）”支持归档（`space.status = 2`），归档后在常规空间列表中不易集中查看与回访。希望增加“发现”页，专门列出所有已归档的群聊，便于用户快速找到并打开/预览。

## 变更内容

1. 新增路由 `/chat/discover`（发现页）。
2. 在发现页中获取当前用户加入的所有 space，并筛选 `status === 2` 的已归档空间进行展示。
3. 为每个已归档空间提供“预览 / 打开”入口。

## 影响范围

- 模块: `app/routes`
- 文件:
  - `app/routes.ts`
  - `app/routes/chatDiscover.tsx`
- API: 复用现有 `GET /space/list`（`useGetUserSpacesQuery`）
- 数据: 无

## 成功标准

- 点击侧边栏“发现”入口可打开 `/chat/discover` 页面。
- 页面可正确列出当前用户已归档的群聊（space），并可跳转预览或打开聊天。

