# 任务清单: Blocksuite Yjs 同步适配层

目录: `helloagents/plan/202601272308_blocksuite_yjs_sync_adapter/`

---

## 1. 后端存储适配层与合并流程
- [√] 1.1 定义 updates 记录模型：`TuanChat/.../blocksuite/domain/entity/BlocksuiteDocUpdate.java`
- [-] 1.2 不修改 `BlocksuiteDocMapper`：改为新增 `BlocksuiteDocUpdateMapper` + DB 表 `blocksuite_doc_update`
- [-] 1.3 不在 `BlocksuiteDocDao` 中混入 updates：改为新增 `BlocksuiteDocUpdateDao` + 存储适配层 `BlocksuiteDocStorageAdapter`
- [√] 1.4 合并/补齐策略：后端提供 updates 入库/拉取/压缩接口；stateVector diff 在前端基于 snapshot+updates 合并后执行
- [√] 1.5 新增 API：`/blocksuite/doc/update`、`/blocksuite/doc/updates`、`/blocksuite/doc/compact`

## 2. 后端 WebSocket 同步协议
- [-] 2.1 不在 `WsGatewayProtocol` 定义业务事件：事件类型复用 `WSReqTypeEnum/WSRespTypeEnum`（新增 200~203 / 200~202）
- [√] 2.2 接入 blocksuite 路由与广播：`TuanChat/.../blocksuite/service/BlocksuiteWsSyncService.java` + `NettyWebSocketServerHandler.java`
- [√] 2.3 doc 维度房间管理：新增 `BlocksuiteDocRoomRegistry`（不改 `WebSocketConnectionRegistry` 的 uid 维度职责）

## 3. 迁移与数据结构
- [√] 3.1 新增 `blocksuite_doc_update` 表与索引：`TuanChat/define.sql`
- [√] 3.2 一次性迁移：`TuanChat/.../blocksuite/service/BlocksuiteDocMigrationService.java` + `BlocksuiteBaselineMigrationRunner.java`

## 4. 前端 API 客户端与 WebSocket 接入
- [-] 4.1 暂不更新 OpenAPI：前端直接用 `tuanchat.request.request` 调用新接口（后续可再补齐生成）
- [-] 4.2 同上：暂不更新生成的 `api/services/*`
- [-] 4.3 暂不扩展 `api/wsModels.ts`：blocksuite WS 使用独立客户端 `blocksuiteWsClient.ts`
- [-] 4.4 暂不改 `api/useWebSocket.tsx`：避免影响现有聊天 WS；后续可按需统一

## 5. 前端 blocksuite 同步管线
- [√] 5.1 `remoteDocSource.ts` 切换为 snapshot + updates log + stateVector diff（前端做 diff），并加入“快照合并+压缩”逻辑
- [√] 5.2 `descriptionDocRemote.ts` 对齐：新增 `getRemoteUpdates/pushRemoteUpdate/compactRemoteUpdates`，并升级快照结构为 v2（兼容 v1）
- [√] 5.3 `spaceWorkspace.ts` 接入 WS join + 远端 update apply；断线补齐改为 stateVector diff
- [√] 5.4 编辑器入口保持“先 snapshot 冷启动、后 WS/updates 增量补齐”的一致策略（无需额外改动入口协议）

## 6. 安全检查
- [√] 6.1 安全检查：HTTP/WS 均复用原有鉴权/权限校验；避免明文密钥；压缩接口需要写权限

## 7. 文档更新
- [√] 7.1 更新 `helloagents/wiki/modules/blocksuite.md`
- [√] 7.2 更新 `helloagents/wiki/modules/chat.md`
- [√] 7.3 更新 `helloagents/wiki/api.md`
- [√] 7.4 更新 `helloagents/wiki/data.md`

## 8. 测试
- [√] 8.1 新增 `TuanChat/src/test/java/com/jxc/tuanchat/blocksuite/BlocksuiteSyncIntegrationTest.java`：覆盖 WS update 的入库/ACK/广播语义（不依赖外部 DB/服务）
