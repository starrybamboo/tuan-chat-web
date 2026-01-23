# 怎么做（How）

## 策略

- 统一在房间列表通用组件 `RoomButton` 做头像兜底：`headerOverride.imageUrl` → `room.avatar` → `/favicon.ico`
- 为 `<img>` 增加 `onError` 回退逻辑：首次加载失败时将 `src` 切到 `/favicon.ico`，避免死循环
- 补齐另一处房间头像展示（KP 线索抽屉的房间列表）同样的兜底与回退

## 验证

- 运行 `pnpm lint`（允许既有警告）
- 运行 `pnpm typecheck`

