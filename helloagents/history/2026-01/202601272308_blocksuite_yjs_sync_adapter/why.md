# 变更提案: Blocksuite Yjs 同步适配层

## 需求背景
当前 blocksuite 文档在前后端以 snapshot 交互为主，缺少基于 yjs updates 的增量同步与实时协作能力。
为了对齐 AFFiNE 的交互范式，需要建立“updates 入库 + 定期合并 snapshot + stateVector diff + WebSocket 推送”的统一链路，并完成一次性迁移。

## 变更内容
1. 引入后端 blocksuite 文档更新管线与存储适配层（updates、snapshot、history、diff）。
2. 增加基于 WebSocket 的同步协议（join/leave、push-update、broadcast、awareness）。
3. 前端切换为 yjs provider，统一通过 updates 与 stateVector 完成交互。
4. 执行一次性迁移：旧 snapshot 转换为新更新存储并校验一致性。
5. 全部 blocksuite 场景统一接入该引擎与同步通道。

## 影响范围
- **模块:** tuan-chat-web blocksuite 集成、API 客户端；TuanChat blocksuite 与 websocket 模块
- **文件:** app/components/chat/infra/blocksuite/*、api/*、TuanChat/src/main/java/com/jxc/tuanchat/blocksuite/*、TuanChat/src/main/java/com/jxc/tuanchat/websocket/*
- **API:** blocksuite 文档 updates 接口与 WebSocket 事件
- **数据:** 新增/调整 blocksuite doc updates、snapshot、history 表与索引

## 核心场景

### 需求: 更新流同步与存储
**模块:** blocksuite / websocket
通过 updates 作为唯一事实来源，服务端可按 stateVector 下发差量，保证断线重连与多端一致。

#### 场景: 实时编辑同步
用户在页面内编辑 blocksuite 文档，updates 被实时推送到服务端并广播到同空间在线客户端。
- 预期结果: 本地与远端内容即时一致，延迟可控

#### 场景: 断线重连增量补齐
客户端断线后重新连接，携带 stateVector 拉取差量 updates 并补齐。
- 预期结果: 仅同步缺失部分，避免全量重复传输

### 需求: 一次性迁移与回放
**模块:** blocksuite
将历史 snapshot 转换为 updates 与 snapshot 记录，保证旧数据可回放与一致。

#### 场景: 全量迁移与一致性校验
执行一次性迁移任务，完成数据落库并做校验。
- 预期结果: 迁移后新旧版本读写一致且可回滚

### 需求: 全部 Blocksuite 场景统一接入
**模块:** blocksuite / chat
所有 blocksuite 编辑入口与预览入口统一切换到新同步管线。

#### 场景: 现有编辑器入口与预览入口
描述编辑器、空间文档、消息卡片预览等均使用同一 provider。
- 预期结果: 行为一致，避免混用 snapshot 与 updates

## 风险评估
- **风险:** 迁移过程数据丢失或不一致  
  **缓解:** 迁移前备份、迁移后比对校验、保留回滚脚本
- **风险:** WebSocket 负载增加导致延迟抖动  
  **缓解:** 压缩 updates、限流与分片广播、合并批处理
- **风险:** 更新合并策略错误导致历史回放异常  
  **缓解:** 引入合并测试用例与回放验证
