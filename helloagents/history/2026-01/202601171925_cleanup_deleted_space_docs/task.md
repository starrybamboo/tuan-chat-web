# 任务清单: 解散后清理 Blocksuite 文档

目录: `helloagents/plan/202601171925_cleanup_deleted_space_docs/`

---

## 1. 房间解散

- [√] 1.1 解散房间成功后清理 `room:<roomId>:description`（避免 `@` 弹窗仍展示）
- [√] 1.2 收到 WS 房间解散推送（type=14）后清理对应 room 文档（覆盖非操作者/旁观者）

## 2. 空间解散

- [√] 2.1 解散空间成功后清理 `space:<spaceId>:description`（房间文档由 1.2 逐个清理）

## 3. 验证

- [√] 3.1 `pnpm run typecheck`
- [√] 3.2 `pnpm run build`

## 4. 知识库同步

- [√] 4.1 更新 `helloagents/wiki/modules/app.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`
