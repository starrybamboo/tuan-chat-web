# 任务清单: Chat 发现页（已归档群聊列表）

目录: `helloagents/plan/202601301403_chat_discover_archived_spaces/`

---

## 1. 路由与页面

- [√] 1.1 在 `app/routes.ts` 新增 `chat/discover` 路由，确保不会被 `chat/:spaceId?...` 误匹配
- [√] 1.2 新增页面 `app/routes/chatDiscover.tsx`：列出 `space.status === 2` 的空间，支持搜索与“预览/打开”

## 2. 文档更新

- [√] 2.1 更新 `helloagents/wiki/modules/chat.md`：补充发现页路由说明
- [√] 2.2 更新 `helloagents/CHANGELOG.md`：记录新增发现页

## 3. 质量与验证

- [√] 3.1 执行 `pnpm typecheck`
- [√] 3.2 执行 `pnpm lint`
