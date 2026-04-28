# Galgame AI 编辑工具计划

## 目标

把当前聊天室形态扩展成 Galgame 写作编辑器，并引入 AI 帮写。这里的“聊天室”只是既有表现层和数据结构，AI 不应该被设计成聊天室里的发言者，也不处理多人协作语义。

AI 的职责：

- 获取当前 Galgame 写作上下文。
- 基于上下文改写、续写、插入或调整当前房间消息。
- 生成结构化 patch。
- 通过本地 diff proposal 让用户确认后再写入。

AI 不做：

- 不直接读写 WebGAL 脚本。
- 不调用 WebGAL 校验。
- 不主动渲染预览。
- 不把发送消息接口直接暴露给 AI；用户确认 proposal 后，新增消息可以由兼容层复用现有发送/批量发送能力写入。
- 不处理素材包插入；第一阶段不需要素材包上下文。

核心链路：

```txt
AI -> Galgame 兼容层上下文 -> 结构化 patch -> 本地 diff proposal -> 用户确认 -> 现有消息/空间 mutation -> 自动转换 WebGAL
```

## 已确定规则

- 上下文优先，不极限省 token；稳定说明直接放进上下文，依赖模型缓存命中。
- 当前房间默认全量读取消息，不按可见窗口裁剪。
- 用户拖入的消息、角色、房间只作为重点引用，不替代完整房间上下文。
- 房间可以类比为结构化故事文档，但实现上仍按领域并列返回，不把消息、角色、annotation、流程图塞进一个 room 对象。
- `Room.description` 是场景简要描述，用于概述本房间剧情走向。
- `UserRole.description` 是人物设定和口吻依据，不是普通简介。
- AI 只能使用当前房间角色生成对白。
- 旁白是特殊 speaker，可用于叙述和无角色文本。
- AI 切换表情、姿态、立绘时，只能选择已有 `RoleAvatar.avatarId`。
- annotation 是演出语义，不是剧情总结。
- AI 只能使用 annotation catalog 中存在的 ID，包括 `cust:*`。
- story flow 基于现有 `Space.roomMap`，不设计抽象的 `flowSummary`。
- AI dry run 不创建服务端 fake commit；使用浏览器本地 proposal。

## 上下文设计原则

AI 上下文是现有数据的投影视图，不是新的领域模型。能复用现有字段名时优先复用：

- `Space.name` 不改成 `spaceName`。
- `Room.name` 不改成 `roomName`。
- `Message.content` 不改成 `text`。
- `Message.position` 用于排序和插入位置，不新增 `order`；`syncId` 可作为兼容层内部兜底，不默认暴露给 AI。
- `UserRole.roleName` 不改成 `name`。
- `RoleAvatar.avatarTitle`、`category` 保持原名；AI patch 只引用 `avatarId`，不直接使用素材 URL 或 transform。

允许新增的投影字段：

| 字段 | 用途 |
| --- | --- |
| `purpose` | 从 `messageType`、`annotations`、`webgal` 推导消息用途，例如对白、旁白、BGM、背景、控制等。 |
| `roleName` | 通过 `Message.roleId` join `UserRole.roleName`，方便 AI 直接写作。 |
| `avatarVariants` | 聚合同一角色的 `RoleAvatar[]`，供 AI 选择已有差分。 |
| `narrator` | AI tool 层旁白 sentinel，不要求数据库使用该值。 |
| `validationWarnings` | 投影过程记录无效流程边、缺失房间、无权访问等问题。 |

默认不暴露与当前写作无关的元数据，例如头像、权限状态、版本链字段、归档字段、创建更新时间、用户归属字段、未规范化的 `extra`。这些字段不是删除，只是默认不进入 `get_gal_authoring_context`。

## 一次性上下文包

主入口：

```ts
get_gal_authoring_context({
  spaceId,
  roomId,
  attachmentRefs?: GalReference[],
  includeFlow?: boolean
})
```

返回结构：

```ts
type GalAuthoringContext = {
  staticGuide: {
    schemaVersion: string
    fieldGuide: string
    patchGuide: string
    validationGuide: string
  }
  space: GalSpaceContext
  room: GalRoomContext
  messages: GalMessageView[]
  roles: {
    roomRoles: GalRoomRole[]
    narrator: GalNarrator
  }
  annotations: GalAnnotation[]
  flow?: GalStoryFlow
  attachmentRefs: GalReference[]
  activeProposal?: GalPatchProposalSummary
}
```

实现要点：

1. 读取当前 `Space` 和当前 `Room`。
2. 读取当前房间全量消息，过滤删除或无效状态，按 `position` 稳定排序。
3. 将消息投影为 `GalMessageView`，补齐 `purpose`、`roleName`。
4. 读取当前房间角色，不读取空间全部角色。
5. 聚合每个角色的 active `RoleAvatar[]` 为 `avatarVariants`。
6. 构造旁白 sentinel。
7. 读取 annotation catalog，合并内置和自定义 annotation，并附带说明。
8. 如果 `includeFlow` 为 true，读取并投影 `Space.roomMap`。
9. 解析 `attachmentRefs`，把用户拖入对象作为重点引用返回。
10. 读取当前活跃本地 proposal 摘要。
11. 拼接稳定 `staticGuide`，包含字段说明、patch 说明、校验说明和禁止事项。

## 领域上下文

### 空间

空间是 Galgame 工程。第一阶段需要空间 ID、空间名、房间列表、annotation catalog，以及可选的 `roomMap`。

```ts
type GalSpaceContext = {
  spaceId: string
  name?: string
  rooms: Array<{
    roomId: string
    name?: string
    description?: string
  }>
  annotationCatalog: GalAnnotation[]
  roomMap?: Record<string, string[]>
}
```

### 房间

房间是当前写作场景的定位锚点。房间上下文只放房间自身字段，不承载消息、角色、annotation 或流程边。

```ts
type GalRoomContext = {
  spaceId: string
  roomId: string
  name?: string
  description?: string
}
```

### 消息

消息是正文和演出的基本编辑单元。AI 看到的是现有 `Message` 的投影视图。

```ts
type GalMessageView = {
  messageId: string
  position: number
  roomId: string
  messageType: number
  purpose: "dialogue" | "narration" | "background" | "cg" | "se" | "bgm" | "control" | "choice" | "unknown"
  roleId?: string
  roleName?: string
  customRoleName?: string
  avatarId?: string
  content: string
  annotations: string[]
  webgal?: Record<string, unknown>
  extra?: Record<string, unknown>
}
```

### 角色

角色是当前房间内可演出的 speaker。AI 只能为当前房间角色或旁白写内容。

```ts
type GalRoomRole = {
  roleId: string
  roleName?: string
  description?: string
  avatarId?: string
  avatarVariants: GalRoleAvatarVariant[]
}

type GalRoleAvatarVariant = {
  roleId?: string
  avatarId: string
  avatarTitle?: Record<string, string>
  category?: string
}

type GalNarrator = {
  roleId: "narrator"
  roleName: "旁白"
  kind: "narrator"
}
```

约束：

- AI 不能为房间外角色生成对白。
- AI 不能写入不存在的 `avatarId`。
- 没有合适差分时，AI 只能建议用户补充。

### Annotation

annotation 是演出语义，不是剧情总结。

```ts
type GalAnnotation = {
  id: string
  label: string
  category?: string
  source: "builtin" | "custom"
  appliesTo?: Array<GalMessageView["purpose"]>
  description?: string
}
```

约束：

- AI 只能使用 catalog 中存在的 annotation ID。
- `cust:*` 也必须来自 catalog，不能自行拼接。
- 不设计 `conflictsWith`，因为 annotation 当前没有通用互斥关系。
- 不要把“角色愤怒”“气氛压抑”这类自然语言直接写成 annotation。

### 故事流程图

故事流程图基于现有 `Space.roomMap`。第一阶段只读，流程图修改放到后续阶段。

AI 读取流程图时看到解析后的投影视图：

```ts
type GalStoryFlow = {
  rawRoomMap: Record<string, string[]>
  nodes: Array<{
    roomId: string
    name?: string
    description?: string
    kind: "start" | "normal"
  }>
  endNodes: Array<{
    endNodeId: string
    label: string
  }>
  edges: Array<
    | {
        edgeId: string
        fromRoomId: string
        toRoomId: string
        conditionText?: string
        kind: "room"
      }
    | {
        edgeId: string
        fromRoomId: string
        toEndNodeId: string
        kind: "ending"
      }
  >
  validationWarnings?: string[]
}
```

实现时复用 `app/components/chat/window/workflowGraphUtils.ts` 中的 `normalizeRoomMap` / `serializeRoomMap`。

## 后续搜索与补查

跨房间搜索用于查伏笔、称呼、设定或相似桥段，不替代当前房间全量读取。第一阶段先不做，等当前房间 AI patch 闭环稳定后再接。

```ts
search_gal_context({
  spaceId,
  query,
  scope?: {
    roomIds?: string[]
    includeMessages?: boolean
    includeRooms?: boolean
    includeRoles?: boolean
  },
  limit?: number
})
```

搜索对象包括 `Message.content`、`Room.name`、`Room.description`、`UserRole.roleName`、`UserRole.description`。

## 故事修改工具

AI 修改故事必须走结构化 patch。

```ts
propose_gal_story_patch({
  roomId,
  patch
})
```

第一阶段支持的操作：

```txt
replace_content
insert_before
insert_after
delete
move
update_annotations
update_role
update_avatar
replace_message
```

实现步骤：

1. 读取当前房间消息作为 `baseSnapshot`。
2. 校验 patch 的 `messageId`、插入位置、`roleId`、`avatarId`、`annotations`。
3. 在本地纯函数中应用 patch，得到 `projectedSnapshot`。
4. 生成 story diff。
5. 写入本地 proposal store。
6. 返回 `proposalId`、diff、summary、validation errors。

## 本地 Diff Proposal

不要用服务端 fake commit。AI dry run 是本地预览，不应污染正式版本链。

```ts
type GalPatchProposal = {
  proposalId: string
  spaceId: string
  roomId: string
  source: "ai"
  status: "draft" | "accepted" | "discarded" | "expired"
  baseFingerprint: GalDocumentFingerprint
  baseSnapshot: GalMessageView[]
  patch: GalStoryPatch
  projectedSnapshot: GalMessageView[]
  diff: GalStoryDiff
  summary: {
    added: number
    deleted: number
    modified: number
    moved: number
    metadataChanged: number
  }
}
```

Diff 至少展示：

- 新增、删除、移动消息。
- `content` 变化。
- `roleId` / `customRoleName` 变化。
- `avatarId` / 差分变化。
- `annotations` 变化。
- `webgal` / `extra` 变化。
- 冲突和校验错误。

存储建议：

- IndexedDB 保存完整 proposal。
- 内存 store 保存当前活跃 proposal。
- localStorage 只保存最近活跃 `proposalId`。

## 应用修改

用户确认后再应用：

```ts
apply_gal_patch_proposal({
  roomId,
  proposalId
})
```

实现步骤：

1. 读取 proposal。
2. 重新读取当前房间消息。
3. 对比 `baseFingerprint`。
4. 如果未变化，转换为现有消息 mutation 并写入。
5. 如果已变化，尝试按 `messageId` rebase。
6. 对新增消息，转换为现有 `ChatMessageRequest`，复用发送/批量发送能力；插入位置通过 `position` 表达。
7. rebase 成功则刷新 diff 并要求用户再次确认。
8. rebase 失败则标记 conflict。

## 校验规则

兼容层必须做结构化校验，不能只依赖 prompt。

至少校验：

- `messageId` 存在且属于当前房间。
- 插入位置存在。
- `roleId` 属于当前房间角色或旁白。
- 房间外角色不能生成对白。
- `avatarId` 为空或属于同一个角色。
- 旁白不绑定普通角色差分。
- `annotations` 全部存在于 catalog。
- annotation 和消息用途匹配。
- patch 不直接生成 WebGAL 脚本。

校验失败时，proposal 应返回 validation error，并展示给用户。

## 不提供给 AI 的能力

- `validate_webgal_scene`：WebGAL 转换由系统自动完成。
- `render_preview`：预览由用户手动触发。
- `preview_story_diff`：不作为独立 AI tool，`propose_gal_story_patch` 自动生成 diff proposal。
- `send_message`：不作为独立 AI tool。新增消息由 `apply_gal_patch_proposal` 在用户确认后转换为现有发送/批量发送 mutation。
- 直接 WebGAL 编辑：AI 只操作兼容层 patch。
- 素材包插入：第一阶段不提供。

## 第一阶段必要能力

```txt
get_gal_authoring_context
propose_gal_story_patch
apply_gal_patch_proposal
StoryPatchDiffPanel
LocalProposalStore
```

第一阶段上下文必须包含：

- 空间信息。
- annotation catalog 与说明。
- 当前房间 `description`。
- 当前房间全量消息。
- 当前房间角色白名单。
- 旁白。
- 当前房间角色差分。
- 消息字段说明。
- patch 格式说明。
- 校验规则。

验收标准：

- AI 一次调用能获得写当前房间所需上下文。
- AI 能看到 annotation 说明和字段说明。
- AI 能看到房间 `description`。
- AI 能看到房间角色、旁白和差分。
- AI 不能使用房间外角色。
- AI 不能使用不存在的 annotation 或 `avatarId`。
- AI patch 能生成本地 diff。
- 用户确认后才能写入。

## 后续阶段

第二阶段：

- `read_gal_story_flow`
- `update_gal_story_flow_proposal`
- `search_gal_context`

第三阶段：

- proposal 过期清理。
- proposal rebase。
- 跨房间一致性搜索。
- 角色口吻批量改写。
- 选择肢生成。
