# app

## 目的

承载前端 UI、路由与页面级业务逻辑。

## 模块概述

- **职责:** 页面路由、页面组件、通用组件与工具库组织
- **状态:** ?开发中
- **最后更新:** 2026-01-14

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
- 乐观显示（room/space）：iframe 侧 header 变化通过 `postMessage` 上报，宿主写入 `entityHeaderOverrideStore`（localStorage），房间/空间列表与房间顶部标题栏优先显示覆盖值
- 线索文档化（方案A试运行）：线索正文统一使用 `BlocksuiteClueDescriptionEditor`（`doc_type=description`），创建线索仅填基础信息（name/image/folder）；`space_clue.note` 保留为兼容字段，不再作为主要编辑入口
- 线索详情弹窗（PL 抽屉）：默认使用全屏弹窗并在顶部固定基础信息/操作区，下方提供大视口的线索文档编辑区；旧 `note` 以折叠区形式展示（默认折叠）
- 嵌入式隔离（官方兼容）：在 blocksuite 初始化前调用 `startBlocksuiteStyleIsolation` + `ensureBlocksuiteRuntimeStyles`，并将 `@toeverything/theme` 的 `:root` 变量与 KaTeX 的 `body{counter-reset}` 作用域化到 `.tc-blocksuite-scope`/`.blocksuite-portal`，避免污染同页其它 UI
- iframe 强隔离（最稳）：通过 `blocksuite-frame` 路由在 iframe 内运行 Blocksuite，主窗口仅作为 iframe 宿主，并用 `postMessage` 同步 mode/theme/导航，彻底避免同页其它 UI 被全局注入污染
- 主题同步：仅同步到 `.tc-blocksuite-scope` 与 `.blocksuite-portal`（不改动 `html/body`），确保弹层与编辑器主题一致
- 上游副作用规避：通过 `pnpm.patchedDependencies` 修补 blocksuite 0.22.4 中对 `document.body.style` 的全局写入（见 `patches/@blocksuite__*.patch`）

### Chat 页面导航

- 房间列表右键菜单“房间资料”入口由 `ChatPageContextMenu` 触发，并通过 `onOpenRoomSetting` 回调跳转到 `/chat/:spaceId/:roomId/setting`
- 进入空间模式时，仅在房间列表已加载且存在房间时才会自动选中按自定义排序的第一个房间；同时兼容 `/chat/<spaceId>/null`，避免首次进入出现 `null` 房间路由

### 跑团指令：检定请求按钮消息

- KP 发送包含 `@All` 的跑团指令（如 `.rc 侦查 @All` / `.r3d6*5 @All`）会生成“检定请求”按钮消息：**不执行**，仅作为点击入口
- 该按钮消息使用独立消息类型：`COMMAND_REQUEST(12)`（与后端 `MessageTypeEnum` 对齐）
- 其他成员点击“一键发送”后，会以自己当前选择角色发送并执行该指令，并落在原消息所在 thread（执行链路复用 `useCommandExecutor`，并补齐 `threadId`/`replayMessageId`）
- 观战成员禁止执行；旁白（未选角色）仅 KP 可用

### Chat 侧边栏分类（sidebarTree）

- 后端持久化：`/space/sidebarTree`（带 `version` 的乐观锁写入），hooks 见 `api/hooks/spaceSidebarTreeHooks.ts`
- UI 渲染/编辑：`app/components/chat/room/chatRoomListPanel.tsx`（新增/重命名/拖拽后通过 `onSaveSidebarTree` 回传保存）
- 展开/折叠状态：仅本地 IndexedDB 保存（`app/components/chat/infra/indexedDB/sidebarTreeUiDb.ts`），不写入后端树结构
- 文档元信息回补：若 Blocksuite workspace `meta.docMetas` 为空，则从 `sidebarTree` 的 doc 节点回补（`extractDocMetasFromSidebarTree`），并通过 `ensureSpaceDocMeta` 回写 workspace meta，避免刷新后文档节点被过滤/无法打开
- 创建入口：分类标题右侧“+”打开“标签页式”创建面板（参考邀请好友）；在同一弹窗内创建房间/文档，成功后自动追加到对应分类并写入 `/space/sidebarTree`
- 文档节点样式：侧边栏文档条目与房间条目字号一致，并在标题前显示文档 icon
- 文档打开方式：统一在 Chat 布局内打开（保留左侧侧边栏），路由为 `/chat/:spaceId/doc/:docId`；兼容入口 `/doc/:spaceId/:docId` 会跳转到上述路由

### AI 生图测试（NovelAI）

- 测试页路由：`/ai-image`（对应 `app/routes/aiImage.tsx`；仅开发环境注册）
- Web 环境默认直连请求 NovelAI（其中 `/user/*` 元数据接口固定走 `https://api.novelai.net`，用于模型/设置拉取；如遇跨域/CORS 或 Referer 限制，可切换为同源代理模式：`/api/novelapi/*`）
- Electron 环境默认通过 IPC 代理请求 NovelAI：`window.electronAPI.novelaiGenerateImage(...)` + `window.electronAPI.novelaiGetClientSettings(...)`
- 支持文生图（txt2img）与图生图（img2img：上传图片 + `strength/noise` 等参数）
- UI 结构与操作逻辑对齐 `https://novelai.net/image`：Prompt/Undesired/Image/History/Connection 分区（tabs）
- 模型列表尝试运行时拉取（失败自动降级并提示）
- 生成历史默认保存到本地 IndexedDB，支持查看/删除/清空
- token 为方便调试会本地持久化（localStorage），可手动清除

## 变更历史

（从 `helloagents/history/` 自动补全）
