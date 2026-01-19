# app

## 目的

承载前端 UI、路由与页面级业务逻辑。

## 模块概述

- **职责:** 页面路由、页面组件、通用组件与工具库组织
- **状态:** ?开发中
$12026-01-19

## 相关模块文档（建议从这里分流查阅）

- Chat：[chat](chat.md)
- Blocksuite 集成：[blocksuite](blocksuite.md)
- WebGAL：[webgal](webgal.md)
- AI 生图：[ai-image](ai-image.md)

## 规范

### 渲染模式（SPA Mode）

- 默认采用 SPA Mode：`react-router.config.ts` 设置 `ssr: false` 且 `prerender: false`

### 目录约定

- `app/routes/`：路由页面（最终页面）
- `app/components/`：页面组件，按业务大模块分类；`common/` 放通用组件
- `app/utils/`：工具函数与通用逻辑
- `app/webGAL/`：WebGAL 相关
  - 实时渲染创建游戏：不使用模板（不传 `templateDir`），创建失败直接返回失败
  - 实时渲染设置：Terre 端口可配置（IndexedDB 持久化）
  - 空间变量系统：导演控制台“设置变量”发送 `WEBGAL_VAR(11)` 结构化消息（也支持 `/var set a=1` 快捷方式）；持久化写入 `space.extra` 的 `webgalVars`（key/value）；实时渲染侧转换为 `setVar:a=1 -global;`

### 样式与组件

- 以 Tailwind CSS + daisyUI 为主，补充样式文件见 `app/app.css` 等

## 依赖

- `api`：后端 API/WS 调用

## 关键子模块

### Blocksuite 集成

- 集成代码：`app/components/chat/infra/blocksuite/`
- SSR/开发态模块评估：避免在 SSR 可达模块的顶层静态引入 `@blocksuite/*` / `lit*`，改为在浏览器事件/Effect 内使用 `import()` 动态加载（例如 `app/components/chat/infra/blocksuite/deleteSpaceDoc.ts`），以规避 `document is not defined`
- 相关文档：`app/components/chat/infra/blocksuite/doc/`（含 `LEARNING-PATH.md` 学习路线）
- 依赖文档：`helloagents/wiki/vendors/blocksuite/index.md`
- 描述文档自定义标题条：`BlocksuiteDescriptionEditor` 支持 `tcHeader`（`tc_header` 存入 doc 的 Yjs spaceDoc），渲染“图片+标题”头部并同步 workspace meta；启用时通过过滤 `DocTitleViewExtension`（兜底按 `name=affine-doc-title-fragment`）禁用 blocksuite 内置 `doc-title`；同时在 tcHeader 模式下增加 `<doc-title>` 的 CSS 兜底隐藏，避免上游差异导致“双标题并存”；tcHeader 标题样式使用 `all: unset` 重写并提供变量 fallback，抵御 iframe 内 blocksuite 注入样式与 reset 的影响
- `@`（Linked Doc）菜单标题来源：`spaceWorkspace.ts` 会将 `workspace.meta.title` 优先与 `tc_header.title` 对齐（无则回退 blocksuite 原生标题），确保提及/引用列表与业务标题一致
- `@`（Linked Doc）标题刷新机制：当 `workspace.meta`（docMetaUpdated）发生变化时，`spaceWorkspace.ts` 会同步触发 `workspace.slots.docListUpdated`（带去重/批量水合节流），确保 blocksuite 的 `DocDisplayMetaProvider` 能刷新菜单与 inline 引用的标题缓存
- 解散房间/空间后的文档清理：业务“解散”成功或收到房间解散推送（type=14）后，会 best-effort 调用 `deleteSpaceDoc` 清理对应 `room:<roomId>:description`/`space:<spaceId>:description`，避免 `@` 弹窗仍展示已删除实体的文档
- 空间描述 @ 提及：选择成员后立即关闭弹窗，并对插入动作增加防重入保护，避免重复插入
- 乐观显示（room/space）：iframe 侧 header 变化通过 `postMessage` 上报，宿主写入 `entityHeaderOverrideStore`（localStorage），房间/空间列表与房间顶部标题栏优先显示覆盖值
- tcHeader 性能：iframe 宿主侧会冻结 `tcHeaderTitle/tcHeaderImageUrl`（仅用于首次初始化或切换 doc 的兜底写入），避免“实时同步标题/头像”导致 iframe `src` 变化触发 `blocksuite-frame` 重新加载
- blocksuite-frame 弹窗挂载点：`/blocksuite-frame` 也会渲染 `modal-root`，以支持 `PopWindow`/图片裁剪上传等基于 Portal 的弹窗
- 文档列表性能：`SpaceWorkspace` 不再在初始化阶段为补齐标题而全量 `doc.load()`；描述文档远端同步不再作为 `DocEngine` shadow 自动拉取全部 subdoc（仅对已打开 doc 绑定推送），并在 pull 阶段不再做远端写回（避免打开文档触发额外 PUT）
- 线索文档化（方案A试运行）：线索正文统一使用 `BlocksuiteClueDescriptionEditor`（`doc_type=description`），创建线索仅填基础信息（name/image/folder）；`space_clue.note` 保留为兼容字段，不再作为主要编辑入口
- 线索详情弹窗（PL 抽屉）：默认使用全屏弹窗并在顶部固定基础信息/操作区，下方提供大视口的线索文档编辑区；旧 `note` 以折叠区形式展示（默认折叠）
- 嵌入式隔离（官方兼容）：在 blocksuite 初始化前调用 `startBlocksuiteStyleIsolation` + `ensureBlocksuiteRuntimeStyles`，并将 `@toeverything/theme` 的 `:root` 变量与 KaTeX 的 `body{counter-reset}` 作用域化到 `.tc-blocksuite-scope`/`.blocksuite-portal`，避免污染同页其它 UI
- 画布切换入口：当 `allowModeSwitch` 启用时，“切换到画布/退出画布”按钮统一渲染在 `tcHeader` 的 actions 区（业务侧不再外置 mode 切换按钮/不再维护外部 mode 状态）
- iframe 强隔离（最稳）：通过 `blocksuite-frame` 路由在 iframe 内运行 Blocksuite，主窗口仅作为 iframe 宿主，并用 `postMessage` 同步 theme/导航/高度；mode 由 frame 回传给宿主用于 page/edgeless 状态同步与布局处理（画布默认占据原文档区域，不再触发宿主全屏覆盖；宿主不再下发 `set-mode`）
- 主题同步：仅同步到 `.tc-blocksuite-scope` 与 `.blocksuite-portal`（不改动 `html/body`），确保弹层与编辑器主题一致
- 上游副作用规避：通过 `pnpm.patchedDependencies` 修补 blocksuite 0.22.4 中对 `document.body.style` 的全局写入（见 `patches/@blocksuite__*.patch`）

### Chat 页面导航

- 房间列表右键菜单“房间资料”入口由 `ChatPageContextMenu` 触发，并通过 `onOpenRoomSetting` 回调跳转到 `/chat/:spaceId/:roomId/setting`
- 进入空间模式时，仅在房间列表已加载且存在房间时才会自动选中按自定义排序的第一个房间；同时兼容 `/chat/<spaceId>/null`，避免首次进入出现 `null` 房间路由

### 跑团指令：检定请求按钮消息

- KP 发送包含 `@All` 的跑团指令（如 `.rc 侦查 @All` / `.r3d6*5 @All`）会生成“检定请求”按钮消息：**不执行**，仅作为点击入口
- 该按钮消息使用独立消息类型：`COMMAND_REQUEST(12)`（与后端 `MessageTypeEnum` 对齐）
- 其他成员点击“检定请求”卡片后（卡片内提示“点击此进行检定”），会以自己当前选择角色发送并执行该指令，并落在原消息所在 thread（执行链路复用 `useCommandExecutor`，并补齐 `threadId`/`replayMessageId`）
- 观战成员禁止执行；旁白（未选角色）仅 KP 可用

### Chat 侧边栏分类（sidebarTree）

- 后端持久化：`/space/sidebarTree`（带 `version` 的乐观锁写入），hooks 见 `api/hooks/spaceSidebarTreeHooks.ts`
- UI 渲染/编辑：`app/components/chat/room/chatRoomListPanel.tsx`（新增/重命名/拖拽后通过 `onSaveSidebarTree` 回传保存）
- 展开/折叠状态：仅本地 IndexedDB 保存（`app/components/chat/infra/indexedDB/sidebarTreeUiDb.ts`），不写入后端树结构
- 文档元信息回补：若 Blocksuite workspace `meta.docMetas` 为空，则从 `sidebarTree` 的 doc 节点回补（`extractDocMetasFromSidebarTree`），并通过 `ensureSpaceDocMeta` 回写 workspace meta，避免刷新后文档节点被过滤/无法打开
- 创建入口：分类标题右侧“+”打开“标签页式”创建面板（参考邀请好友）；在同一弹窗内创建房间/文档，成功后自动追加到对应分类并写入 `/space/sidebarTree`
- 文档节点样式：侧边栏文档条目与房间条目字号一致；默认显示文档 icon；当文档启用 `tc_header.imageUrl` 时条目显示缩略图并叠加文档 icon（保持与房间条目区分），缩略图/标题的本地缓存见 `app/components/chat/stores/docHeaderOverrideStore.ts`
- 文档打开方式：统一在 Chat 布局内打开（保留左侧侧边栏），路由为 `/chat/:spaceId/doc/:docId`；兼容入口 `/doc/:spaceId/:docId` 会跳转到上述路由
- 文档头部：独立文档打开后启用 `tcHeader`（`tc_header.title/imageUrl`）并禁用 Blocksuite 内置 `doc-title`，标题/封面在侧边栏条目中乐观显示

### AI 生图测试（NovelAI）

- 测试页路由：`/ai-image`（对应 `app/routes/aiImage.tsx`；仅开发环境注册）
- 提供两种模式：
  - 普通模式：仅 txt2img；一行自然语言 →（后端 LLM 转换）→ tags → 一键出图；转换出的 tags 允许继续编辑并再次生成；参数面板仅保留宽/高/Seed（Seed 小于 0 表示随机），其余使用默认值；支持可选负面 tags；支持“画风”多选并追加对应 tags；支持一键切换到专业模式继续微调
  - 专业模式：桌面端三栏布局（左侧参数/中间预览/右侧历史），交互与视觉分区对齐 `https://novelai.net/image`；支持 v4/v4.5 的“背景/角色”分区编辑并映射到 `v4_prompt`/`v4_negative_prompt`（`base_caption` + `char_captions`），并支持角色顺序/坐标开关
- 连接与请求方式：右上角“设置”弹窗统一配置（Token/Endpoint/代理或直连）
- NAI v4/v4.5 模型：需要使用 `params_version=3` 的参数结构，并通过 `v4_prompt`/`v4_negative_prompt` 传递 prompt；如使用旧结构可能导致上游 500
- Web 环境默认使用同源代理模式请求 NovelAI：`/api/novelapi/*`（其中 `/user/*` 元数据接口固定走 `https://api.novelai.net`，用于模型/设置拉取；如需排查上游响应，可切换为“直连”模式，但可能被跨域/CORS 或 Referer 限制拦截）
- 注意：`pst-*`（persistent access token）无法访问 `/user/clientsettings` / `/user/data` 等用户元数据接口（会 403），此时模型列表直接降级为内置列表；如需运行时模型列表，请使用 `/user/login` 返回的 `accessToken`（novelai-bot 同样走该流程）
- 若本机网络无法直连 NovelAI（例如需要本地代理/加速），可配置 `NOVELAPI_PROXY=http://127.0.0.1:7897`；在 Windows 上若开启了系统代理（ProxyServer），dev server 会自动尝试读取并使用
- Electron 环境默认通过 IPC 代理请求 NovelAI：`window.electronAPI.novelaiGenerateImage(...)` + `window.electronAPI.novelaiGetClientSettings(...)`
- 支持文生图（txt2img）与图生图（img2img：上传图片 + `strength/noise` 等参数）
- UI 结构与操作逻辑对齐 `https://novelai.net/image`：三栏分区（参数/预览/历史）
- 模型当前锁定为 `nai-diffusion-4-5-full`（NAI v4.5 Full）；其中“4.5 FULL”对应的模型 ID 即 `nai-diffusion-4-5-full`
- 生成历史默认保存到本地 IndexedDB，支持查看/删除/清空；v4/v4.5 生成会额外保存角色/坐标等结构化信息，点击历史可回填编辑器
- token 为方便调试会本地持久化（localStorage），可手动清除

## 变更历史

（从 `helloagents/history/` 自动补全）
