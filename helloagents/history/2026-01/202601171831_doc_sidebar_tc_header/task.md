# 任务清单: sidebarTree 文档 tcHeader（标题/封面）一致化

Ŀ¼: `helloagents/plan/202601171831_doc_sidebar_tc_header/`

---

## 1. 文档主视图 tcHeader
- [√] 1.1 在 `app/components/chat/chatPage.tsx` 为文档主视图启用 `tcHeader` 并接入 `onTcHeaderChange`，验证 why.md#需求-文档头部一致化-场景-打开文档并查看头部
- [√] 1.2 在 `app/components/chat/chatPage.tsx` 同步 `tc_header.title` 到本地 doc metas（侧边栏标题即时刷新），验证 why.md#需求-文档头部一致化-场景-修改标题后同步到列表

## 2. 侧边栏缩略图展示
- [√] 2.1 新增 `app/components/chat/stores/docHeaderOverrideStore.ts`（localStorage 缓存），用于侧边栏展示标题/封面
- [√] 2.2 在 `app/components/chat/room/chatRoomListPanel.tsx` 使用缩略图渲染文档条目（叠加文档 icon 区分房间），验证 why.md#需求-文档头部一致化-场景-上传更换图片后同步到列表

## 3. 安全检查
- [√] 3.1 仅落地标题/ͼƬ URL 到 localStorage；不引入后端 schema/权限变更

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 执行 `pnpm typecheck`
- [√] 5.2 执行 `pnpm lint`
