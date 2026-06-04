## Context

现有咕噜噜导入脚本已经能把楼层 Markdown、图片审查结果和 BGM 行转换为 `.tuanchat-replay-import.json` 与 `.chat-import.txt`，但这不应该推动团剧共创新增 replay 专用功能。Replay 复刻只是 AI 代理要完成的一类房间创作任务；团剧共创侧应该暴露稳定的创作原语，供 AI 代理组合：创建/复用角色、上传/复用头像、上传/引用媒体、批量写入消息、保存来源元数据、检查批次结果、导出 WebGAL。

当前团剧共创已经有普通导入对话、骰子导入构建、角色/头像管理、统一 room message stream、`/chat/message/patch` 和 WebGAL 导出能力。本变更的目标是把这些能力整理为 agent-facing CLI/API，而不是引入独立的 replay 数据模型。

## Goals / Non-Goals

**Goals:**

- 提供 AI 代理可调用的通用 room authoring CLI/API。
- 支持批量创建或复用角色、头像、BGM/媒体资源。
- 支持批量写入 room message stream，并保留来源元数据。
- 支持批次级 inspect/cleanup/export，方便 AI 代理复核和纠错。
- 让咕噜噜 replay 复刻通过这些通用原语完成，验证对白、旁白、骰子、BGM 和头像切换都能表达。

**Non-Goals:**

- 第一版不新增面向最终用户的浏览器 replay 导入 UI。
- 第一版不新增 replay 专用服务端模型、专用消息流或专用时间线。
- 第一版不重新设计 room/message/role/avatar 的底层模型。
- 第一版不保证所有外部格式都能自动解析；外部格式解析由 AI 代理或专用脚本完成，团剧共创只接收通用创作原语调用。

## Decisions

### 1. 团剧共创提供原语，AI 代理负责编排

CLI/API 应按通用能力拆分，而不是按 replay 工作流拆分：

- `role upsert`：按名称、来源 key 或策略创建/复用角色。
- `avatar upload/upsert`：按文件、hash、来源路径创建/复用头像。
- `media upload/upsert`：上传或复用 BGM、音效、图片等媒体资源。
- `message batch write`：批量写入消息流，支持角色、头像、消息类型、extra 和来源元数据。
- `batch inspect`：返回批次写入结果、统计、缺失项和来源定位。
- `batch cleanup`：清理失败或未提交批次创建的草稿资源。
- `webgal export`：基于房间消息和媒体元数据导出 WebGAL。

AI 代理负责把 replay 包、Markdown、图片审查表或其他外部输入转换成这些原语调用。

### 2. 批次是审计和幂等边界，不是 replay 模型

每次 AI 写入应生成通用 authoring batch。Batch 记录导入来源、输入 hash、操作者、目标房间、资源映射、消息 id 和统计。它用于幂等、复核、清理和回溯，不代表 replay 专用时间线。

重复写入检测基于目标房间、来源 key 和输入 hash。若 AI 代理确实需要重复写入，必须显式传 `force` 或新的 batch source key。

### 3. 消息写入统一使用 room message stream

对白、旁白、骰子、BGM 都写入现有房间消息流。差异通过现有字段和 message extra 表达：

- 对白：`roleId`、`avatarId`、文本内容、可选原始说话人。
- 旁白：旁白/系统角色语义或 message extra 标记。
- 骰子：保存历史骰子文本和结果，不重新投骰。
- BGM：引用媒体资源或保留 unresolved 状态。

WebGAL 导出只需要识别通用消息语义和媒体引用，不需要识别“这是 replay 导入来的”。

### 4. BGM 是媒体原语的一部分

BGM 复刻不应绑定 replay 导入。AI 代理可以基于原文 BGM 名称、链接、manifest、本地文件或可解析远端资源调用 `media upload/upsert`。无法解析时，消息仍可写入 unresolved BGM extra，`inspect` 和 `webgal export` 报告待补项。

### 5. 来源元数据保持通用

来源元数据使用通用结构，例如：

```text
source.kind = "gululu" | "manual" | "external"
source.workId
source.segmentId
source.eventIndex
source.originalSpeaker
source.originalAssetPath
source.originalBgmName
```

Replay 的楼层号只是 `segmentId` 的一种取值，不应成为专用字段。

## Risks / Trade-offs

- [Risk] 原语太底层导致 AI 代理调用复杂 -> Mitigation: 提供高级 CLI wrapper，但 wrapper 仍组合通用原语，不进入服务端专用模型。
- [Risk] 批量写入失败后留下孤立资源 -> Mitigation: batch 标记新建资源，提供 cleanup；复用的既有资源不删除。
- [Risk] 来源 metadata 过大 -> Mitigation: 每条消息只保存定位字段，完整外部包归档在 batch 或本地工作目录。
- [Risk] WebGAL 导出需要 replay 特例 -> Mitigation: 先补齐通用消息 extra 到 WebGAL 映射，只有字段语义，不判断来源类型。

## Migration Plan

第一阶段新增 agent-facing 原语 CLI/API 和 batch 记录，不迁移已有房间。

第二阶段用咕噜噜 1-62 楼 replay 作为验收样例，通过通用原语完成角色、头像、BGM、消息写入和 WebGAL 导出。

第三阶段把这些原语复用于其他 AI 房间创作任务，例如批量导入文本、旧文档迁移、WebGAL 草稿生成和素材包落地。

## Open Questions

- Batch 记录应落在后端新表，还是第一版先写入 message extra 加本地报告。
- 旁白和 BGM 事件是否使用专用角色、系统消息类型，还是仅用 message extra 区分。
- CLI 是否优先实现为前端仓库脚本调用现有 OpenAPI，还是后端直接提供更粗粒度的 batch API。
