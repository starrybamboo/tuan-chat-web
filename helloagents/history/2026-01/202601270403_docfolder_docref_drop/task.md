# 任务清单: 支持拖拽文档卡片复制到我的文档

目录: `helloagents/history/2026-01/202601270403_docfolder_docref_drop/`

---

## 1. 复制能力复用
- [√] 1.1 在 `app/components/chat/utils/docCopy.ts` 新增 `copyDocToSpaceUserDoc`（复用 `getDocUpdateForCopy`），供“右键复制到我的文档”和“拖拽到我的文档”共用
- [√] 1.2 在 `app/components/chat/room/contextMenu/chatFrameContextMenu.tsx` 复用 `copyDocToSpaceUserDoc`，保持行为一致（标题/封面写入、远端快照写入、列表刷新）

## 2. 我的文档支持 DocRef drop
- [√] 2.1 在 `app/components/chat/room/drawers/docFolderForUser.tsx` 增加 DocRef dragover/drop：将聊天消息里的文档卡片拖入后创建副本（space_user_doc）并追加到目标分类
- [√] 2.2 在 `helloagents/wiki/modules/chat.md` 补充“文档卡片 → 我的文档”的拖拽复制说明
- [√] 2.3 在 `helloagents/CHANGELOG.md` 记录本次新增能力

## 3. 验证
- [?] 3.1 手动验证：从消息列表拖拽文档卡片到“我的文档”抽屉分类区域，松手后出现 toast、触发复制请求、树中新增文档并可打开
