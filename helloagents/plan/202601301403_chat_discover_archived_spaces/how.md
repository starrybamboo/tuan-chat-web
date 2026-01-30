# 技术设计: Chat 发现页（已归档群聊列表）

## 技术方案

- 路由: 在 `app/routes.ts` 中新增静态路由 `chat/discover`，放置在 `chat/:spaceId?/:roomId?/:messageId?` 之前，避免参数路由误匹配。
- 数据: 通过 `useGetUserSpacesQuery()` 拉取 space 列表，前端筛选 `space.status === 2` 作为“已归档群聊”。
- 交互:
  - 搜索框：按名称/简介做前端包含匹配（大小写不敏感）。
  - 卡片操作：`预览 -> /space-preview/:spaceId`；`打开 -> /chat/:spaceId`。

## 安全与性能

- **安全:** 不新增任何敏感数据读写；仅复用现有查询接口。
- **性能:** 只在客户端进行轻量筛选与排序；查询结果由 react-query 缓存（`staleTime` 由现有 hooks 控制）。

## 测试与验证

- `pnpm typecheck`（确保路由 types 与组件类型无误）
- `pnpm lint`（确保无 ESLint 错误）
- 手动：进入聊天室侧边栏点击“发现”，确认列表渲染与跳转正确

