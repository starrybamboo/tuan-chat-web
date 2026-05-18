# 团剧共创 Copilot 实施方案

更新时间：2026-05-06

## 目标

实现一个类似 Copilot 的“房间剧本编辑助手”：用户在右侧 Copilot 面板中用自然语言描述修改意图，系统读取当前聊天室/Galgame 写作上下文，生成结构化 `GalStoryPatch`，在聊天室中展示改动预览，用户确认后应用到现有消息，并自动触发 WebGAL 重渲染。

第一版目标不是做“大而全 Agent”，而是做稳定、可控、可回滚的当前房间 AI 改稿闭环。

## 技术结论

采用“前端 TypeScript AI 编排模块 + 现有 Java AI Gateway + 现有 React proposal/apply 链路”的方案，不再引入独立 TS 中间服务。

```txt
React Copilot UI
  -> 前端 TypeScript 编排（上下文 / prompt / schema / repair）
  -> Java AI Gateway（scene / 限流 / usage / 模型白名单）
  -> 上游模型
  -> 前端 TypeScript 校验与修复
  -> React createGalPatchProposal
  -> 聊天区 diff 预览
  -> 用户确认
  -> 现有消息 mutation
  -> WebGAL 重渲染
```

关键原则：

- 前端可以组装当前房间上下文、prompt、schema 校验、JSON repair 和 validation-error repair。
- Java AI Gateway 继续保留模型治理权，不被前端直连供应商替代。
- 前端只携带用户 token 调用 Java AI Gateway，不保存 provider API key。
- 前端继续负责 proposal、diff 预览、确认、应用和 WebGAL 联动。
- 不新增独立 Node AI 服务，本地开发不需要额外启动 `5178`。

## 为什么不再加入独立 TS 中间层

现有前端已经有 `galgameAi` 底层能力，后端也有 AI 网关。原先的独立中间层方案本质上是补“AI 编排层”：

- 把 `GalAuthoringContext` 稳定压成模型输入。
- 约束模型只返回 `GalStoryPatch`。
- 校验、修复、归一化模型输出。
- 处理流式状态与多轮会话。
- 管理 active proposal 与用户追问。

这些工作仍然适合用 TypeScript 做，但不必成为独立服务。当前前端是 SPA（React Router `ssr: false`），没有天然 server route；Java 后端已经能通过 OpenAI-compatible gateway 承担鉴权、限流、usage、审计、模型白名单和 provider key 隔离。继续开一个 `5178` Node 中间层会增加本地启动和部署复杂度，却没有明显安全收益。

因此第一版把 TypeScript 编排放在前端模块中：前端组 prompt、调 Java Gateway、解析 OpenAI SSE、提取 JSON、用共享 `zod` schema 校验并修复；Java 后端只做安全治理与模型转发。

## 总体分层

### React 前端

职责：

- 提供右侧 Copilot 面板。
- 读取当前房间状态、选中消息、拖入引用。
- 调用 `getGalAuthoringContext` 构建上下文。
- 构造 Copilot system/user/repair prompt。
- 使用用户 token 调用 Java AI Gateway 的 OpenAI-compatible 接口。
- 解析非流式响应与 OpenAI-style SSE 流。
- 提取 JSON、执行 `zod` 校验、JSON repair 和 validation-error repair。
- 调用 `createGalPatchProposal` 生成 proposal。
- 使用已有 `buildGalProposalMessagePreview` 展示改动预览。
- 用户确认后调用已有 proposal apply 链路。

不做：

- 不保存模型密钥。
- 不绕过 proposal 直接改消息。

### 前端 TypeScript 编排模块

职责：

- 接收当前房间上下文与用户指令。
- 构造 system prompt、developer prompt、用户指令和上下文包。
- 调用 Java AI Gateway。
- 使用 `zod` 校验 `GalStoryPatch`。
- 必要时执行一次 JSON repair。
- 必要时基于业务校验错误执行一次 validation-error repair。
- 返回结构化 patch、自然语言摘要、warnings，并向 UI 发出流式状态事件。

不做：

- 不直接查数据库。
- 不做消息落库。
- 不保存供应商模型密钥。
- 不持久化正式业务数据。

### Java AI Gateway

职责：

- 新增 `galgame_authoring` scene。
- 继续负责鉴权、限流、模型白名单、模型别名、usage 事件、上游转发。
- 提供 OpenAI-compatible 非流式/流式接口给前端。

不做：

- 不理解 `GalStoryPatch` 业务语义。
- 不做 Copilot 会话编排。

## 新增包与模块

### 共享契约包

建议新增：

```txt
tuan-chat-web/packages/galgame-ai-contract
```

内容：

- `GalStoryPatch` 类型。
- `GalStoryPatchOperation` 类型。
- `GalAuthoringContext` 的 Copilot 输入类型。
- `zod` schema。
- schema 到 TypeScript 类型的导出。

这样前端 Copilot 编排、proposal 生成与测试不需要复制 patch 结构。

### 前端 Copilot client

建议新增或保留：

```txt
tuan-chat-web/app/components/chat/galgameAi/copilotClient.ts
tuan-chat-web/app/components/chat/galgameAi/copilotPrompts.ts
```

职责：

- `copilotPrompts.ts` 管理 system prompt、普通生成 prompt、JSON repair prompt、validation-error repair prompt。
- `copilotClient.ts` 通过 `fetchWithUnifiedAuth` 调 Java AI Gateway。
- 默认 scene 使用 `galgame_authoring`。
- 默认模型使用后端 scene 允许的模型别名。
- 非流式走 `/ai/gateway/v1/chat/completions`。
- 流式走 `/ai/gateway/v1/chat/stream`，前端解析 OpenAI-style SSE。

## 接口设计

### 1. 单轮 patch 生成

第一版前端内部保留单轮生成函数，网络请求直接打 Java AI Gateway。

```txt
POST /ai/gateway/v1/chat/completions
```

前端内部输入：

```ts
type GenerateGalPatchRequest = {
  spaceId: string;
  roomId: string;
  instruction: string;
  context: GalAuthoringContext;
  selectedMessageIds?: string[];
  attachmentRefs?: GalReference[];
  activeProposal?: GalPatchProposalSummary;
};
```

发送给 Java AI Gateway 的请求：

```ts
type OpenAiCompatibleRequest = {
  scene: "galgame_authoring";
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature: 0.2;
  response_format: { type: "json_object" };
};
```

前端内部输出：

```ts
type GenerateGalPatchResponse = {
  patch: GalStoryPatch;
  assistantText?: string;
  warnings: string[];
  rawModelOutputId?: string;
};
```

约束：

- `patch.operations` 不能为空，除非返回 warning 说明“无需修改”。
- patch 里只能引用 context 中存在的 `messageId`、`roleId`、`avatarId`、annotation id。
- Copilot client 只返回 patch，不直接返回 proposal；proposal 仍由前端基于当前快照创建。

### 2. 流式 patch 生成

第二阶段增加。

```txt
POST /ai/gateway/v1/chat/stream
```

Java Gateway 返回 OpenAI-style SSE：

```txt
data: {"choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

前端把模型 token 拼成完整文本，并对 UI 发出本地 `GalCopilotPatchStreamEvent`：

```txt
status: analyzing_context
status: drafting_patch
status: validating_patch
warning: ...
patch: GalStoryPatch
done
```

用途：

- 让右侧 Copilot 面板显示“正在分析上下文 / 正在生成改动 / 正在校验”。
- patch 最终仍只在校验通过后交给前端生成 proposal。

### 3. 多轮会话

第三阶段增加。第一版可以先用前端本地状态保存 Copilot 对话、用户指令、assistant 摘要和 active proposal summary；需要跨设备或刷新保留时，再新增 Java 后端会话接口。

会话只保存 Copilot 对话与 active proposal 摘要，不保存正式消息数据，不绕过 proposal/apply 链路。

## Prompt 与输出策略

### System 角色

固定身份：

```txt
你是团剧共创的 Galgame 剧本编辑助手。
你不能直接发送消息，不能直接写 WebGAL 脚本。
你只能根据上下文返回 GalStoryPatch JSON。
```

### 输入内容

前端组装：

- 字段说明：来自 contract 的 schema guide。
- patch 操作说明：允许的 op、字段要求、禁止事项。
- 当前 `GalAuthoringContext`。
- 用户自然语言指令。
- selectedMessageIds / attachmentRefs。
- activeProposal 摘要。

### 输出内容

第一版要求模型只输出：

```json
{
  "operations": []
}
```

不让模型同时输出长解释。解释可以由前端根据 diff summary 生成，或放到 `assistantText` 中，但不能干扰 patch JSON。

## 校验与修复

### 前端 schema 校验

使用 `zod` 校验：

- op 枚举合法。
- required 字段齐全。
- `operations` 是数组。
- `messageType`、`content`、`annotations` 等类型正确。

### 前端业务校验

继续使用现有：

- `validateGalStoryPatch`
- `createGalPatchProposal`
- proposal validation errors

前端校验是最终业务校验，因为它拥有当前实时消息快照。

### Repair 策略

如果模型输出不是合法 JSON：

1. 前端尝试提取 JSON 对象。
2. 仍失败时，调用一次 repair prompt。
3. repair 仍失败，返回用户可读错误，不生成 proposal。

如果 JSON 合法但业务校验失败：

- 将 errors 发回模型做一次“基于错误修复 patch”。
- repair 后仍失败，则显示错误并不生成 proposal。

## 前端交互方案

### 入口位置

结合当前 UI，建议放在右侧副窗口区域：

- 空状态：显示 Copilot 输入框。
- 有对话：显示 Copilot 消息流。
- 有 proposal：聊天区显示改动预览，右侧显示解释、warnings、重新生成入口。

### 用户操作

支持第一版动作：

- 输入自然语言修改要求。
- 选中若干消息后“让 Copilot 修改选中内容”。
- 将消息拖入右侧 Copilot 面板作为引用。
- 生成预览。
- 应用。
- 取消。
- 重新生成。

第一版暂不支持：

- 自动应用。
- 跨房间搜索。
- 批量重写全剧本。
- flow 图修改。

### 安全默认值

- 默认必须用户确认后应用。
- 有 validation errors 时禁止应用。
- proposal 激活时禁用消息拖拽、跳转等容易混淆的操作；当前代码已有部分禁用逻辑。
- 应用成功后如 WebGAL 实时渲染开启，触发重渲染。

## 后端改造

### 新增 scene

在 Java 后端配置中增加：

```yaml
tuanchat:
  ai-gateway:
    scenes:
      scene-policies:
        galgame_authoring:
          label: "Galgame 写作"
          default-model: "gpt-5.4-mini"
          allowed-models:
            - "gpt-5.2"
            - "gpt-5.2-high"
            - "gpt-5.2-xhigh"
            - "gpt-5.4-mini"
```

### 前端调用方式

前端不直连 OpenAI，调用 Java AI Gateway：

```txt
POST /ai/gateway/v1/chat/completions
```

或第二阶段：

```txt
POST /ai/gateway/v1/chat/stream
```

请求必须携带：

```json
{
  "scene": "galgame_authoring",
  "model": "gpt-5.4-mini",
  "messages": []
}
```

## 分阶段实施

### 阶段 0：契约整理

目标：让前端 Copilot 编排与 proposal/apply 链路共享 patch 结构。

任务：

- 抽出 `packages/galgame-ai-contract`。
- 搬迁或复制 `GalStoryPatch` 相关类型。
- 定义 `zod` schema。
- 前端 `galgameAi` 模块改为引用 contract。

验收：

- 前端现有 `galgameAi` 测试通过。
- contract 能被前端 `galgameAi` 与 Copilot client 同时 import。

### 阶段 1：单轮 Copilot MVP

目标：用户输入一句话，生成当前房间 patch，并在聊天室预览。

任务：

- 前端新增右侧 Copilot 面板。
- 前端调用 `getGalAuthoringContext`。
- 前端 Copilot client 调 `/ai/gateway/v1/chat/completions`，拿到 patch。
- 前端调用 `createGalPatchProposal`。
- 接入已有 proposal preview/apply。
- 后端新增 `galgame_authoring` scene。

验收：

- 能对当前房间已有消息执行改写。
- 能在指定消息前后插入旁白或对白。
- 能修改角色、avatar、annotation 中至少一种元数据。
- 校验失败时不允许应用。
- 用户点击应用后消息落库，WebGAL 可重渲染。

### 阶段 2：流式体验与错误修复

目标：让 Copilot 像真实助手一样反馈过程，并提升 patch 成功率。

任务：

- 前端 Copilot client 调 `/ai/gateway/v1/chat/stream`。
- 前端解析 OpenAI-style SSE 并显示流式状态。
- 增加一次 JSON repair。
- 增加一次 validation-error repair。
- 展示 warnings 与模型摘要。

验收：

- 用户能看到生成进度。
- 非 JSON 输出可自动修复一次。
- 常见字段错误可自动修复一次。
- 失败时保留用户输入和上下文，不污染消息。

### 阶段 3：多轮与 active proposal

目标：支持“这版不够好，再改得更紧张一点”。

任务：

- 必要时 Java 后端增加 Copilot session API。
- 会话记录用户指令、assistant 摘要、active proposal summary；优先前端本地，必要时再落 Java 后端。
- 前端把 active proposal 带入下一轮。
- 支持基于 projectedSnapshot 继续生成 patch。

验收：

- 用户可以连续追改同一个 proposal。
- 未应用 proposal 不污染正式消息。
- 取消 proposal 后会话状态同步清理。

### 阶段 4：跨房间与高级工具

目标：扩展到更像“剧本工程 Copilot”。

任务：

- `search_gal_context`。
- 跨房间称呼/伏笔检查。
- 角色口吻批量改写。
- 选择肢生成。
- story flow 修改 proposal。

验收：

- 能查询其他房间但仍只修改用户确认范围。
- 跨房间修改必须分组展示 diff。
- flow 修改与消息修改分开确认。

## 测试策略

### 前端

- `galgameAi` 现有测试继续保留。
- 增加 contract schema 测试。
- 增加 Copilot panel 交互测试。
- 增加 patch preview/apply 集成测试。

重点用例：

- 改写一条消息。
- 插入新旁白。
- 删除一条消息。
- 修改 annotation。
- 使用不存在角色时被拒绝。
- 使用不存在 avatar 时被拒绝。

### 前端 Copilot client

- prompt builder 快照测试。
- zod schema 测试。
- JSON extract/repair 测试。
- Java Gateway mock 测试。
- stream event 顺序测试。

### 后端

- `galgame_authoring` scene 模型目录测试。
- scene 白名单拒绝测试。
- usage event 记录测试。
- 限流 429 事件测试。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 模型输出不稳定 | 强制 schema、JSON repair、业务校验、失败不落库。 |
| patch 引用过期消息 | 使用 base fingerprint，后续补 rebase/conflict。 |
| 上下文太大 | 第一版当前房间全量；后续做摘要和搜索，不提前优化。 |
| AI 改错内容 | 默认预览确认，不自动应用。 |
| 多人同时编辑冲突 | 第一版提示冲突；第二/三阶段补 rebase。 |
| 两套网关混乱 | 不再新增独立 TS 中间层；前端只调用 Java AI Gateway，不直连供应商。 |
| 类型漂移 | 抽 contract 包，前端 Copilot client/proposal/apply 共享 schema。 |

## 参考资料

- Java AI Gateway：`TuanChat/src/main/java/com/jxc/tuanchat/ai/gateway/controller/AiGatewayOpenAiController.java`
- 前端 Copilot client：`app/components/chat/galgameAi/copilotClient.ts`
- 前端 Copilot prompts：`app/components/chat/galgameAi/copilotPrompts.ts`
- 共享契约包：`packages/galgame-ai-contract`
