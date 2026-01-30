# chat

## 目的

承载“空间/房间聊天”业务：消息流、房间资料、侧边栏分类（sidebarTree）、跑团指令与各类业务面板。

## 模块概述

- **职责:** Chat 页面与布局、房间列表与分类、消息渲染与发送、房间资料与文档入口、跑团相关交互
- **状态:** ?开发中
- **最后更新:** 2026-01-30



## 入口与目录

- 主要目录：`app/components/chat/`
- 关键路由：
  - `/chat/discover`：发现页（列出已归档群聊/空间）
  - `/chat/:spaceId/:roomId`：房间聊天页
  - `/chat/:spaceId/:roomId/setting`：房间资料页（含 Blocksuite 文档）
  - `/chat/:spaceId/doc/:docId`：独立文档页（保留侧边栏）
- 关键 UI：
  - `SpaceDetailPanel`（空间抽屉面板）：支持 `members/workflow/trpg/setting` 四类 tab；其中 `trpg` 对应 `SpaceTrpgSettingWindow`（空间规则/空间骰娘）

## 核心概念（约定）

- **spaceId / roomId**：聊天空间与房间标识
- **threadId**：消息线程（回复/引用等按 thread 聚合）
- **sidebarTree**：侧边栏分类树（后端持久化 + 本地 UI 状态）
- **业务文档（Blocksuite）**：空间资料/房间资料/独立文档统一走 Blocksuite 集成（iframe 强隔离为默认策略）

### 需求: 拖拽时自动上下滚动
**模块:** chat
拖拽消息靠近列表顶部/底部时，列表应自动滚动；离开触发区或结束拖拽后停止。

#### 场景: 指针进入顶部或底部触发区
前置条件:
- 用户在聊天消息列表中拖拽消息。
- 指针接近列表顶部或底部触发区。

- 预期结果:
  - 顶部触发区：列表持续向上滚动。
  - 底部触发区：列表持续向下滚动。
  - 离开触发区或拖拽结束时停止滚动。

### 需求: 聊天气泡文本选区保持
**模块:** chat
聊天消息文本选中后，松开鼠标应保留选区，不触发消息跳转或多选。

#### 场景: 松开鼠标仍保留
前置条件:
- 用户在消息气泡文本区域拖拽选择文本。
- 松开鼠标完成选择。

- 预期结果:
  - 选区保持可复制。
  - 不触发消息跳转或多选。

## 关键流程速记

### 1) 侧边栏分类（sidebarTree）

- 后端持久化：`/space/sidebarTree`（带 `version` 的乐观锁写入）
- UI 状态（展开/折叠）：仅本地 IndexedDB 保存，不回写后端树结构
- 文档元信息（doc metas）回补：当 Blocksuite workspace 的 docMetas 不足时，从 sidebarTree 的 doc 节点回补，确保文档节点可见/可打开
- 首屏缓存展示：doc 节点在 treeJson 中缓存 `fallbackTitle/fallbackImageUrl`，并在 docMetas 仍未加载时优先用缓存渲染（避免文档列表“晚出现/空白”）
- 文档拖拽协议：`docRef`（`application/x-tc-doc-ref`，兜底 `text/uri-list` / `text/plain`），用于“文档节点 → 聊天发送”与“聊天文档卡片 → 侧边栏复制”

### 1.1) 聊天文档卡片（DOC_CARD）与复制

- 文档卡片消息：发送的是“引用 + 只读预览”，打开弹窗内嵌 Blocksuite 只读编辑器
- 拖拽复制：将聊天列表内的文档卡片拖到 sidebarTree 分类区域，松开后会创建新的 `space_doc` 并复制正文快照，然后把新文档节点追加到 treeJson
  - 权限：仅 KP 可写侧边栏
  - 空间限制：不允许跨 space
  - 交互反馈：hover 分类区域会出现“松开复制到侧边栏 / 仅KP可复制到侧边栏”提示；drop 后会 toast 提示成功/失败
  - 兼容性：部分环境 dragover 阶段 `DataTransfer.types` 可能不暴露自定义 MIME，需同时兼容 `text/uri-list` / `text/plain` 兜底，并确保 dragover 阶段 `preventDefault` 以触发 drop
  - 易用性：文档卡片封面图片禁用浏览器默认“拖拽图片”行为，避免拖拽命中封面时变成图片拖拽而导致侧边栏无法识别 docRef
  - 兼容性：拖拽开始时阻止事件冒泡，避免被“消息拖拽移动”逻辑接管（`effectAllowed=move` 会导致侧边栏无法以 copy 接收）

### 2) 房间资料 / 文档入口

- “房间资料”通常是 Chat 内的一个业务面板，但其正文编辑统一走 Blocksuite 文档（见 blocksuite 模块文档）。

### 3) 跑团指令：检定请求按钮消息

- 使用独立消息类型：`COMMAND_REQUEST(12)`（与后端枚举对齐）
- KP 发送包含 `@All` 的指令会生成“检定请求”卡片；成员点击后以自身角色在原 thread 执行该指令

### 4) 文本导入：txt → 多条聊天消息

- 入口位于房间顶部“聊天记录”下拉（导入/导出合并入口）：支持选择 `.txt` 文件或粘贴文本
- 解析规则：每行一条消息，格式为 `[角色名]：对话内容`（支持中文/英文冒号）
- 角色映射：优先按“角色名精确匹配”自动映射；无法唯一匹配时要求用户手动指定映射后再发送
- 导入消息会写入 `message.webgal.customRoleName`，显示时保留导入文本中的发言人名
- 发言人名展示：优先展示 `customRoleName`（如有），否则展示 `role.roleName`；不再用 `*` 标记“名称不一致/自定义名称”
- KP 可选择“旁白（roleId=-1）”作为导入目标
- 若发言人映射为“骰娘（系统）”，发送时会解析实际骰娘角色并按 `DICE(6)` 类型发送（`extra.result=content`）
- 导入/发送会在运行时为相关角色解析 `avatarId`：优先使用 `curAvatarIdMap`（用户选择），否则回退 `role.avatarId`，再回退头像列表“默认”标签/首个头像（不强制持久化）
- 消息头像渲染：当 `avatarId<=0` 且无法找到可用头像时，不再回退到 `/favicon.ico`（显示为空占位）
- 立绘位置：可为每个发言人选择左/中/右位置，导入发送时写入 `message.webgal.voiceRenderSettings.figurePosition`
- 若当前房间无可用角色（非KP），导入弹窗提供“创建/导入角色”快捷入口
- 导入弹窗 UI：双栏布局与单层容器，避免双层滚动，缺失角色高亮与快捷引导

### 4.1) 音频消息播放（AudioMessage）

- 播放组件使用 WaveSurfer（波形播放器）
- 为避免列表渲染/刷新时触发 Range 拉取：WaveSurfer **仅在点击播放时**才初始化并加载音频
- 发送侧会填充 `extra.soundMessage.second`（音频时长，秒）；当浏览器无法解析本地音频时长导致 `duration=NaN` 时，会进行兜底（避免 second 非法导致发送失败）
- ⚠️ Hooks 规则：不要在调用 React Hooks 之前 `return null`（例如 `url` 为空时）；应在 Hooks 之后再做条件返回，避免 `react-hooks/rules-of-hooks`

### 4.2) 全局音频播放聚合（悬浮球）

- 全局悬浮球用于聚合“所有正在播放的音频”，展示数量徽标，展开后以列表形式独立展示并允许操作（暂停/停止）
- 音频消息本身仍按消息流独立显示与交互；悬浮球仅作为聚合入口
- 播放状态通过 `useAudioPlaybackRegistration` 写入全局 store；更新元信息（title/url/pause/stop）不会重置 `isPlaying`，避免播放器组件重渲染导致悬浮球“闪现后消失”
- 关键入口：
  - `app/components/common/audioPlaybackStore.ts`
  - `app/components/common/useAudioPlaybackRegistration.ts`
  - `app/components/common/audioFloatingBall.tsx`
  - `app/components/chat/infra/bgm/bgmPlaybackRegistry.tsx`
  - `app/root.tsx`

### 5) 房间角色：NPC+ 快速创建

- KP 在“角色列表”点击 `NPC+` 打开“创建NPC”弹窗（复用角色创建流程），创建完成后自动加入当前房间
- 创建时通过 `type=2 + spaceId` 绑定空间，后端会自动将其纳入“空间 NPC 库”，方便后续在其它房间复用（也可从 NPC 库导入）
- 点击角色头像弹窗：默认复用角色页面详情（CharacterDetail）；在房间上下文中保留“踢出角色”等权限操作
- 角色列表头像展示：优先使用角色 avatarId；缺失时取该角色头像列表首个头像作为展示兜底（仅前端显示）
- 删除房间角色：KP 可在角色头像详情中将 NPC/角色从当前房间移除
- 获取“我的角色”：前端改用 `GET /role/user/type`（分别取 type=0/1），不再从 `/role/user` 拉取后再前端过滤

## 相关文档

- 项目概览：[overview](../overview.md)
- app 模块（含 Chat/Blocksuite 集成事实来源）：[app](app.md)
- Blocksuite 集成：[blocksuite](blocksuite.md)
- Blocksuite 依赖与坑位：[vendors/blocksuite](../vendors/blocksuite/index.md)

## 变更历史

- [202601281930_audio-playback-floatball](../../history/2026-01/202601281930_audio-playback-floatball/) - 全局音频悬浮球：聚合所有正在播放音频并提供列表视图
- [202601272011_import-chat-style](../../history/2026-01/202601272011_import-chat-style/) - 导入对话弹窗去双层容器，长内容可滚动
- [202601242150_webgal_realtime_resync](../../history/2026-01/202601242150_webgal_realtime_resync/) - WebGAL 实时预览：消息插入/删除/移动/重排时自动重建历史，尾部追加仍增量追加
- 2026-01-24 空间列表按钮悬停提示恢复为 tooltip 样式（允许溢出/截断）
- 2026-01-23 修复聊天消息文本选区松开后丢失
- 2026-01-23 修复拖拽离开消息列表时无法继续自动滚动的问题
- 2026-01-23 修复拖拽自动滚动回调依赖顺序导致运行时报错
- 2026-01-23 修复拖拽自动滚动重复声明导致构建失败
- [202601242230_chat_avatar_runtime_default](../../history/2026-01/202601242230_chat_avatar_runtime_default/) - 房间加载/导入/发送时运行时解析 avatarId（不强制持久化），缺失时显示为空占位
- [202601242032_chat_import_fill_avatar_map](../../history/2026-01/202601242032_chat_import_fill_avatar_map/) - 聊天导入头像选择兜底（已被 202601242230 覆盖）
- [202601232052_chat_import_preserve_speaker_name](../../history/2026-01/202601232052_chat_import_preserve_speaker_name/) - 聊天导入保留原发言人名
- [202601232052_chat_text_selection](../../history/2026-01/202601232052_chat_text_selection/) - 聊天气泡文本选区保持
- [202601231857_chat-drag-auto-scroll](../../history/2026-01/202601231857_chat-drag-auto-scroll/) - 拖拽移动消息时支持顶部/底部自动滚动

- [202601231851_role_avatar_fallback](../../history/2026-01/202601231851_role_avatar_fallback/) - 房间角色导入头像兜底显示（avatarId 为空时取首个头像）
- [202601222021_room_avatar_fallback](../../history/2026-01/202601222021_room_avatar_fallback/) - 修复房间初次导入无头像：头像缺失/加载失败时回退到默认头像
- [202601201337_chat_import_text](../../history/2026-01/202601201337_chat_import_text/) - 新增聊天室文本导入（txt → 多条消息，按角色名映射发送）
- [202601201620_chat_import_dicer](../../history/2026-01/202601201620_chat_import_dicer/) - 文本导入支持“骰娘”发言：按骰娘角色发送并使用 `DICE(6)` 类型
- [202601211623_chat_import_figure_position](../../history/2026-01/202601211623_chat_import_figure_position/) - 文本导入支持为发言人设置立绘位置（左/中/右）
- [202601211700_chat_import_ui_refine](../../history/2026-01/202601211700_chat_import_ui_refine/) - 文本导入弹窗 UI 重构：双栏布局、预览、缺失映射提示与快捷创建入口

## ????
- 2026-01-27: ??????????????????????????????
- @ ????????????????????????
- ?? @ ????????????????????????
- ????????????? roleId ??????????
## Space 用户文档夹（docFolder）

- 入口：聊天输入区 Dock 模式中，线索按钮左侧“我的文档”
- 抽屉：右侧轻量抽屉 `sideDrawerState="docFolder"`（`VaulSideDrawer`）
- 能力：文件夹/文档列表、新建文件夹、新建文档、删除、点击打开 Blocksuite 编辑
  - 文档标题修改：在文档内部通过 `tc_header` 修改，前端监听后同步到后端
  - 文件夹重命名：仍在列表侧操作（文件夹无“内部标题”入口）
- 拖拽复制：将“聊天消息列表的文档卡片消息”拖到“我的文档”抽屉的分类区域，松开后会创建一份 `space_user_doc` 副本并追加到目标分类
- 数据：对接 `/space/docFolder/*`（树 JSON + version 乐观锁；文档列表与元数据）
- UI 注意：列表项的“⋮”下拉菜单需要提升操作区 `z-index`（父层带 `transform` 时需在父层设置），避免被后续列表项遮挡

---

### 需求: 文档卡片消息（Blocksuite Doc Card）
**模块:** chat
在同一 space 内，支持把 Blocksuite 文档以“卡片消息”形式发送到聊天室，并提供弹窗只读预览。

#### 场景: 从文档树拖拽到聊天室发送
前置条件：文档为可远端读取的 Blocksuite docId（`parseDescriptionDocId` 可解析，如 `udoc:*:description`）。
- 将文档从“我的文档/文档树”拖拽到消息列表或输入框区域后，直接发送一条文档卡片消息
- 拖拽语义为“复制引用”，不改变文档树结构
- 拖拽数据协议与解析工具：`app/components/chat/utils/docRef.ts`
- 兼容性：dragover 阶段仅用 `isDocRefDrag(dataTransfer)` 判定并 `preventDefault`，payload 在 drop 阶段再读取
- 交互提示：投放区域在识别到文档引用拖拽后，会显示“松开发送文档卡片”提示

#### 场景: 点击卡片弹窗只读预览
- 卡片展示：标题、封面（tcHeader imageUrl）、内容摘要（段落提取）
- 点击卡片：弹窗打开 Blocksuite 只读预览（iframe 隔离）

#### 协议: DOC_CARD
- `messageType`: `MESSAGE_TYPE.DOC_CARD`（当前为 1002）
- `extra.docCard`:
  - `docId: string`（Blocksuite docId）
  - `spaceId: number`（用于同一 space 校验/降级）
  - `title?: string`（发送时兜底标题）
  - `imageUrl?: string`（发送时兜底封面）
  - `excerpt?: string`（发送时兜底摘要；消息列表卡片摘要仅依赖该字段，不在渲染时读取/拉取文档内容）
 - 兼容：若历史/后端消息未写入 `messageType=DOC_CARD`，但 `extra.docCard` 存在，前端仍会按文档卡片消息渲染

#### 约束
- 仅支持同一 space 分享/预览；跨 space 将阻止发送或展示降级提示

#### 交互：从消息复制为副本（copy）

- 入口：消息右键菜单（文档卡片消息）
  - `复制到我的文档`：创建一份新的“Space 用户文档（udoc）”并复制内容快照
  - `复制到空间侧边栏`：仅 KP 可见；创建一份新的“Space 共享文档（space_doc / sdoc）”并追加到 `sidebarTree(cat:docs)`，同时写入 `fallbackTitle/fallbackImageUrl` 以便首屏快速展示
- 复制语义：真正 copy（副本可编辑），与“发送 DOC_CARD（引用 + 只读预览）”不同
- 约束：不允许跨 space 复制
- 数据来源：复制以 Blocksuite “full update”为准——优先把源文档的远端快照 restore 到本地 workspace，再导出 full update；若远端不可用则回退本地 IndexedDB 内容
- 远端落库：复制后会将目标文档的 full update 写入 `/blocksuite/doc`，供其它端恢复/预览
- 实时协作：编辑阶段以 `/blocksuite/doc_update` 的 yjs updates 日志 + WebSocket fanout 为主；快照仅用于冷启动与压缩（详见 blocksuite 模块文档）
