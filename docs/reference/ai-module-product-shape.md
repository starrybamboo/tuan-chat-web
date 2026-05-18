# 团剧共创 AI 模块产品形态整合

更新时间：2026-05-04

## 文档定位

本文是团剧共创 AI 模块的总入口，整合此前分散在前端、后端与辅助测试文档中的 AI 相关结论，并按当前代码标注实现状态。

状态口径：

- `[已实现]`：已有对应生产代码、模块或后端接口；若还缺产品入口，会在说明中单独标出。
- `[部分实现]`：底层类型、纯函数、接口或 UI 承载位已存在，但尚未形成完整产品闭环。
- `[未实现]`：仍停留在规划或旧文档描述中，当前主仓未找到对应实现。
- `[相关能力]`：不属于 Galgame 写作 AI 主线，但与 AI 基础设施或素材链路相关。

## 整合来源

| 来源 | 定位 | 当前处理 |
| --- | --- | --- |
| `tuan-chat-web/docs/reference/galgame-ai-tool-plan.md` | Galgame AI 写作编辑工具的原始方案 | 作为本文产品形态主线 |
| `TuanChat/docs/ai-gateway/thin-governance-proxy-prd.md` | 后端 AI 薄治理代理 PRD | 作为本文后端边界主线 |
| `TuanChat/docs/ai-gateway/README.md` | AI 网关调研总览 | 合并其“薄代理而非大平台”结论 |
| `TuanChat/docs/ai-gateway/implementation-roadmap.md` | AI 网关落地路线 | 合并接口与分阶段方向 |
| `tuan-chat-web/docs/help/ai-role-generation-eval-once.md` | AI 车卡生成手动评测清单 | 合并到“角色生成”能力状态 |
| `tuan-chat-web/docs/reference/webgal-realtime-render-rules.md` | WebGAL 实时渲染规则 | 作为 AI 写作落库后的自动转换基础 |
| `tuan-chat-web/docs/reference/message-annotation-send-flow.md` | annotation 发送链路 | 作为 AI 可控演出语义基础 |
| `tuan-chat-web/docs/reference/role-avatar-image-pipeline-prd.md` | 角色头像/立绘资源链路 | 作为后续差分与素材能力背景 |

旧文档保留为历史细节和专题说明；后续讨论“AI 最终做成什么样”优先更新本文。

## 产品总方向

团剧共创的 AI 模块不应被设计成“聊天室里的 AI 角色”。当前产品方向是：

> 把现有聊天室扩展成 Galgame 写作编辑器，AI 作为写作编辑工具读取上下文、生成结构化修改方案，经用户确认后再写入现有消息/空间数据。

主链路：

```txt
AI -> Galgame 兼容层上下文 -> 结构化 patch -> 本地 diff proposal -> 用户确认 -> 现有消息/空间 mutation -> 自动转换 WebGAL
```

这个方向把 AI 限定为“可控编辑层”，避免它绕过用户确认直接发消息、直接改 WebGAL 脚本或污染正式数据。

## 职责边界

### 前端职责

- 构建 Galgame 写作上下文投影视图。
- 提供 AI 写作入口、流式体验、diff 预览与用户确认。
- 将 AI 返回的结构化 patch 转换成本地 proposal。
- 用户确认后，复用现有消息新增、修改、删除、批量发送能力写入数据。
- 写入后复用现有 WebGAL 实时渲染链路生成演出。

### 后端职责

- 作为 AI 薄治理代理，不做重型编排平台。
- 负责鉴权、限流、场景控模型、模型别名、审计、usage 事件、上游转发。
- 通过 `scene` 限定业务场景可用模型，而不是让前端自由选择任意模型。
- 保持 OpenAI 兼容接口，便于前端和后续工具链复用。

### AI 不做

- 不作为聊天室成员直接发言。
- 不直接读写 WebGAL 脚本。
- 不主动调用 WebGAL 校验或预览。
- 不直接调用发送消息接口。
- 第一阶段不处理素材包插入。

## 现有实现总览

### Galgame 写作 AI 主线

| 能力 | 状态 | 代码依据 | 说明 |
| --- | --- | --- | --- |
| Galgame 上下文类型 | `[已实现]` | `app/components/chat/galgameAi/authoringTypes.ts` | 已定义 `GalAuthoringContext`、消息、角色、annotation、flow、proposal、patch 等类型。 |
| 消息/角色/annotation 投影 | `[已实现]` | `app/components/chat/galgameAi/authoringProjection.ts` | 已能从现有 `Space`、`Room`、`Message`、`UserRole`、`RoleAvatar` 投影为 AI 可读视图。 |
| 当前房间上下文读取 | `[部分实现]` | `app/components/chat/galgameAi/galAuthoringService.ts` | 已有 `getGalAuthoringContext`，会读取空间、房间、房间消息、当前房间角色/NPC、角色差分和活跃 proposal；但尚未接成可供 AI 调用的产品入口。 |
| 当前房间全量消息 | `[已实现]` | `galAuthoringService.ts` 调用 `chatController.getAllMessage` | 符合旧方案“当前房间默认全量读取消息”的方向。 |
| 当前房间角色白名单 | `[已实现]` | `roomRoleController.roomRole`、`roomNpcRole`、`projectGalRoomRoles` | AI 视图只聚合当前房间角色与 NPC，并附带角色差分。 |
| 旁白 sentinel | `[已实现]` | `GAL_NARRATOR` | 已将 `narrator` 作为特殊 speaker。 |
| annotation catalog | `[已实现]` | `mergeAnnotationCatalog`、`buildGalAnnotations` | 已把内置/自定义 annotation 投影给 AI 上下文。 |
| story flow 读取 | `[部分实现]` | `projectGalStoryFlow` | 目前只返回 `rawRoomMap`，还没有旧方案里的 nodes、edges、endNodes 富投影。 |
| attachmentRefs | `[部分实现]` | `GalReference`、`getGalAuthoringContext` 参数 | 类型与透传已存在，但还没有“拖入对象解析为重点引用”的完整产品交互。 |
| patch 操作集合 | `[已实现]` | `GalStoryPatchOperation`、`storyPatch.ts` | 已支持 `replace_content`、`insert_before`、`insert_after`、`delete`、`move`、`update_annotations`、`update_role`、`update_avatar`、`replace_message`。 |
| patch 结构化校验 | `[部分实现]` | `validateGalStoryPatch` | 已校验消息存在、角色归属、avatar 归属、annotation 存在、move 锚点；尚未完整校验 annotation 与用途匹配，也未在代码层识别“直接生成 WebGAL 脚本”。 |
| 本地 diff/proposal 生成 | `[已实现]` | `createGalPatchProposal`、`buildGalStoryDiff` | 已生成 base fingerprint、projected snapshot、diff、summary、validation errors。 |
| LocalProposalStore | `[部分实现]` | `localProposalStore.ts` | IndexedDB、localStorage 活跃 proposal、内存 store 已实现；当前主链路未找到产品级创建入口接入。 |
| proposal 预览 | `[部分实现]` | `galProposalMessagePreview.ts`、`chatFrame.tsx` | 已可把 proposal 投影成消息列表并复用现有 full diff 渲染；不是独立的 `StoryPatchDiffPanel`。 |
| proposal 应用 | `[部分实现]` | `galPatchMutationAdapter.ts`、`galPatchMutationExecutor.ts`、`roomWindow.tsx` | 已能把 proposal 转为 insert/update/delete 并应用；缺少完整 rebase、冲突处理和 AI 生成 proposal 的入口闭环。 |
| 应用后 WebGAL 重渲染 | `[已实现]` | `roomWindow.tsx` 的 `rerenderHistoryInWebGAL` 调用 | proposal 应用成功后，实时渲染开启时会重渲染 WebGAL。 |
| AI 写作调用入口 | `[未实现]` | 未找到前端 Galgame AI 调用 UI/API | 当前有底层 `galgameAi` 模块，但没有“让 AI 读取上下文并返回 patch”的产品入口。 |
| `propose_gal_story_patch` AI tool | `[未实现]` | 未找到同名工具或 AI 调用适配层 | 纯函数 `createGalPatchProposal` 已有，但还不是 AI tool。 |
| 跨房间搜索 | `[未实现]` | 未找到 `search_gal_context` 实现 | 仍是后续阶段。 |
| story flow 修改 proposal | `[未实现]` | 未找到 `update_gal_story_flow_proposal` 实现 | 仍是后续阶段。 |
| proposal rebase/过期清理 | `[未实现]` | 未找到 rebase/expire 逻辑 | 旧方案第三阶段内容尚未落地。 |

### 后端 AI 网关

| 能力 | 状态 | 代码依据 | 说明 |
| --- | --- | --- | --- |
| 统一文本中转 | `[已实现]` | `AiGatewayController.relay`、`AiGatewayService.relay` | `POST /ai/gateway/relay` 已存在。 |
| OpenAI 兼容非流式接口 | `[已实现]` | `AiGatewayOpenAiController.chatCompletions` | `POST /ai/gateway/v1/chat/completions` 已存在，返回 OpenAI 风格响应。 |
| SSE 流式接口 | `[已实现]` | `AiGatewayOpenAiController.streamChat`、`AiGatewayService.streamChatCompletions` | `POST /ai/gateway/v1/chat/stream` 已存在，输出 OpenAI 风格 chunk 与 `[DONE]`。 |
| 场景模型目录 | `[已实现]` | `AiGatewayController.listModels`、`AiGatewayScenePolicyService.listModels` | `GET /ai/gateway/models?scene=...` 已实现。 |
| 场景白名单校验 | `[已实现]` | `AiGatewayScenePolicyService.validateModelAllowed` | `relay`、`chat/completions`、`chat/stream` 都会在携带 scene 时校验模型。 |
| 场景配置 | `[已实现]` | `application.yml` 的 `tuanchat.ai-gateway.scenes` | 已配置 `general_text` 与 `role_generate`。 |
| 模型别名 | `[已实现]` | `AiGatewayService.resolveClient` | 当前 Copilot 默认使用上游已配置的 `gpt-5.4-mini`。 |
| 用户/IP 限流 | `[已实现]` | `AiGatewayRateLimitService` | Redis 计数限流已实现，失败时放行。 |
| usage 事件对象与落库服务 | `[部分实现]` | `AiUsageEvent`、`AiUsageEventDao`、`AiGatewayUsageEventService` | 实体、DAO、service 与调用记录已实现；未在 `src/main/resources` 找到 `ai_usage_event` 建表 SQL。 |
| 上游 usage 捕获与估算 | `[已实现]` | `AiGatewayService.resolveUsage`、`resolveUpstreamUsage` | 非流式和流式都能记录 upstream 或 estimated usage。 |
| 成本与额度扣减 | `[未实现]` | `cost` 固定为 `BigDecimal.ZERO` | 真实成本统计、额度表、扣减策略仍未落地。 |
| 前端模型目录消费 | `[未实现]` | 仅生成了 `AiGatewayControllerService.listModels` | 前端业务代码未找到 `listModels` 调用。 |
| 前端流式消费 | `[未实现]` | 仅生成了 `AiGatewayOpenAiControllerService.streamChat` | 前端业务代码未找到对 `chat/stream` 的真实消费。 |

### 当前产品中已经存在的 AI 相关功能

| 能力 | 状态 | 代码依据 | 说明 |
| --- | --- | --- | --- |
| 角色 AI 车卡生成 UI | `[已实现]` | `CharacterDetail.tsx`、`AIGenerateModal.tsx` | 角色详情页已有 `AI生成` 弹窗，可预览并应用 act/basic/ability/skill。 |
| 角色生成提示词与校验 | `[已实现]` | `api/hooks/abilityQueryHooks.tsx` | 根据规则模板生成提示词，解析 JSON，校验并尝试修复。 |
| 角色生成手动评测清单 | `[已实现]` | `docs/help/ai-role-generation-eval-once.md` | 已有一次性评测用例。 |
| 角色生成接入 scene 治理 | `[未实现]` | `app/utils/aiRelay.ts` | 当前前端固定走 `gpt-5.4-mini`，没有把 `scene: role_generate` 传给后端。 |
| 聊天输入 AI 重写 | `[未实现]` | `app/components/chat/README.md` 仅为旧说明 | 当前手测文档明确 Tab 不触发 AI 改写，主代码未找到 `AIRewriteButton` 实现。 |
| AI 辅助 DM | `[未实现]` | `app/components/chat/README.md` TODO | 仍是旧路线图中的待办。 |
| NovelAI 导演工具代理 | `[相关能力]` | `NovelApiProxyController`、`app/components/aiImage` | 属于 AI 图片/导演工具链，不是 Galgame 写作 AI 主线。 |

## 第一阶段建议收敛范围

为了把现有底层能力连成真实产品闭环，第一阶段建议只做“当前房间写作 AI”：

1. 增加当前房间 AI 写作入口。
2. 调用 `getGalAuthoringContext` 构造上下文。
3. 通过后端 AI 网关发起请求，新增 `scene`，建议命名为 `galgame_authoring`。
4. 要求模型只返回 `GalStoryPatch`。
5. 前端用 `createGalPatchProposal` 生成本地 proposal。
6. 用现有 proposal 预览和工具条展示改动。
7. 用户确认后调用现有 proposal apply 链路。

第一阶段不做：

- 跨房间搜索。
- story flow 修改。
- 素材包插入。
- 自动 WebGAL 校验。
- AI 直接发送消息。
- 多人协作语义推断。

## 需要补齐的最小缺口

| 缺口 | 优先级 | 说明 |
| --- | --- | --- |
| 前端 Galgame AI 入口 | 高 | 没有入口，现有 `galgameAi` 模块无法形成产品闭环。 |
| AI 请求适配层 | 高 | 需要把 `GalAuthoringContext` 包装成 prompt，并强制模型返回 `GalStoryPatch`。 |
| 新增 `galgame_authoring` scene | 高 | 后端已有 scene 治理框架，但还没有 Galgame 写作场景配置。 |
| proposal 创建与持久化接线 | 高 | `LocalProposalStore` 已有，但缺少入口侧保存、激活、恢复、丢弃流程。 |
| validation error 展示 | 中 | 当前可生成 validation errors，但需要产品化展示与重试入口。 |
| rebase/conflict | 中 | 当前 apply 没有完整 rebase；多人或同时编辑场景下容易需要。 |
| 前端消费模型目录 | 中 | 后端已有 `GET /ai/gateway/models`，前端还未用它渲染模型选择或默认模型。 |
| usage 表建表脚本 | 中 | 后端实体与 DAO 已有，但主资源目录未找到对应建表 SQL。 |

## 阶段性决策

- 2026-05-03：开始讨论“团剧共创 AI 模块”的最终产品形态，并建立持续记录文档。
- 2026-05-03：在项目中找回旧记录，确认方向是“Galgame 写作编辑工具 + 结构化 patch + 本地 diff proposal + 用户确认后落库”，不是“AI 作为聊天室成员直接发言”。
- 2026-05-04：整合 Galgame AI、AI 网关、角色生成、WebGAL/annotation 基础文档，并按当前代码标注实现状态。
