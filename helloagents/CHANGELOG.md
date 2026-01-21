# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- Blocksuite 描述文档支持自定义“图片 + 标题”头部（`tc_header`），并禁用 blocksuite 内置 `doc-title`；宿主侧支持乐观显示 room/space 标题与头像覆盖值
- Blocksuite 描述文档 `tcHeader` 新增“重置内置标题”按钮：一键清空 blocksuite 内置页面标题（用于修复历史文档的双标题/标题不一致）
- Blocksuite 描述文档画布（edgeless）新增“全屏/退出全屏”按钮（浏览器 Fullscreen API）
- 新增 BlockSuite 学习路线文档：`app/components/chat/infra/blocksuite/doc/LEARNING-PATH.md`
- 新增 Blocksuite 依赖文档索引与包说明：`helloagents/wiki/vendors/blocksuite/`
- 新增 Quill 引用统计审计报告：`helloagents/wiki/reports/2026-01-14_quill_reference_audit.md`
- 跑团指令支持“检定请求按钮消息”：使用独立消息类型 `COMMAND_REQUEST(12)`；KP 发送包含 `@All` 的指令会生成可点击按钮，成员点击后以自身角色一键发送并在原 thread 执行
- WebGAL 实时预览设置支持配置 Terre 端口，并将 TTS/WebGAL 设置改为 IndexedDB 持久化
- WebGAL 空间变量系统：导演控制台支持“设置变量”发送 `WEBGAL_VAR(11)` 结构化消息（也支持 `/var set a=1` 快捷方式），变量持久化到 `space.extra.webgalVars` 并在实时渲染中转换为 `setVar:* -global;`
- Chat 房间列表：分类标题右侧新增“+”创建入口，可创建房间/文档并自动加入分类（持久化到 `/space/sidebarTree`）
- 新增 AI 生图测试页：`/ai-image`（Electron 主进程代理请求 NovelAI，便于本地调试）
- AI 生图页 `/ai-image` 新增 Simple（简单形态）：自然语言 →（后端 LLM 转换）→ NovelAI tags → 出图，并支持回填到高级面板继续微调
- 新增 Blocksuite 集成豆知识文档：`helloagents/wiki/vendors/blocksuite/gotchas.md`
- 新增模块文档：`helloagents/wiki/modules/chat.md`、`helloagents/wiki/modules/blocksuite.md`、`helloagents/wiki/modules/webgal.md`、`helloagents/wiki/modules/ai-image.md`
- 新增本地开发工作流：`helloagents/wiki/workflows/local-dev.md`
- 聊天输入区支持导入 `.txt` 文本为多条消息：按 `[角色名]：内容` 解析，自动匹配可用角色，无法匹配时提示用户指定映射后再发送
- 聊天室文本导入：当房间无可用角色时提供“创建/导入角色”快捷入口
- 聊天室文本导入：支持发言人为“骰娘”时按 `DICE(6)` 类型发送（`extra.result=content`）
- 聊天室文本导入：支持为发言人设置立绘位置（左/中/右），发送时写入 `message.webgal.voiceRenderSettings.figurePosition`

### 变更
- 聊天室文本导入：导入弹窗 UI 重构（双栏分区、消息预览、缺失映射提示与快捷创建入口）
- 合并冲突处理：启用仓库级 rerere，并使用自动策略完成冲突解决与提交
- Blocksuite：`@`（Linked Doc）候选列表标题优先使用 `tc_header.title`（与业务侧标题保持一致）
- 优化 Blocksuite：`@`（Linked Doc）弹窗将“用户/成员”候选默认收起为二级入口（“展开用户列表”），避免成员过多影响选择文档
- 优化 Blocksuite：文档内“用户 mention”支持点击跳转个人主页，并支持悬浮预览个人主页
- 优化 Blocksuite：默认关闭 mention/debug 相关控制台输出（需显式开启 `tc:blocksuite:debug=1` 或 `__TC_BLOCKSUITE_DEBUG=true`）
- 修复 Blocksuite：`@`（Linked Doc）候选列表与 inline 引用标题不刷新：当 `workspace.meta` 更新时同步触发 `workspace.slots.docListUpdated`，让 `DocDisplayMetaProvider` 刷新标题缓存
- 修复 Blocksuite：解散房间/空间后 `@` 弹窗仍出现已删除实体的文档：解散成功或收到房间解散推送（type=14）时 best-effort 清理对应 doc meta（`room:<roomId>:description`/`space:<spaceId>:description`）
- 修复 Blocksuite：未打开过的房间/空间文档在 `@`（Linked Doc）弹窗中显示 blocksuite 原生标题：进入空间后用房间/空间列表预填 `workspace.meta.title`，并避免在无 `tc_header.title` 时被原生标题覆盖
- 优化 Blocksuite：打开空间文档不再触发空间内所有 room/clue 描述文档的远端拉取；远端快照同步改为仅对已打开 doc 绑定 push，避免全量 `/blocksuite/doc` GET
- Chat：房间资料页移除 `max-h-[80vh]` 限制，修复底部留白
- Blocksuite：画布切换不再全屏覆盖，改为占据原文档区域
- 房间列表分类右侧“+”改为“标签页式”创建面板（参考邀请好友），同一弹窗内完成创建房间/文档
- 文档查看统一使用 Chat 内主视图（`/chat/:spaceId/doc/:docId`），兼容入口 `/doc/:spaceId/:docId` 改为跳转到 Chat 布局（保留侧边栏并支持当前文档高亮）
- sidebarTree 文档节点样式对齐房间：字号一致，并在标题前插入文档 icon
- sidebarTree 独立文档打开页启用 `tcHeader`（禁用 blocksuite 内置 `doc-title`），支持上传封面并在侧边栏文档节点展示缩略图（本地缓存 `docHeaderOverrideStore`）
- WebGAL 空间变量设置入口支持“导演控制台 → 设置变量”，并保留 `/var set ...` 作为快捷方式
- 跑团指令“检定请求按钮消息”：移除额外“一键发送”按钮，点击检定请求卡片本体即可发送执行（不可执行时提示原因）
- 跑团指令“检定请求按钮消息”：卡片增加“点击此进行检定”提示文案，并强化 hover/focus 视觉以提升可点击识别度
- 线索（space_clue）正文改为使用 BlockSuite 文档入口，线索创建/详情不再编辑 `description/note`（`note` 保留为兼容字段）
- 线索详情弹窗 UI 重构：默认全屏、更大文档视口，顶部固定基础信息/操作区，旧笔记默认折叠
- NovelAI OpenAPI 客户端目录去重：移除重复的 `novelai-api/`，规范文件迁移到 `api/novelai/api.json`
- Blocksuite 描述文档 `tcHeader` 标题样式重写（变量 fallback + `all: unset`），并在 tcHeader 模式下兜底隐藏 `<doc-title>`，避免与内置标题并存；同时加固 `disableDocTitle` 过滤逻辑（兜底按 extension name 匹配）
- Blocksuite 描述文档 `tcHeader` 头部样式重写：单行布局（图片 + 标题 + 操作按钮）、顶部 sticky 吸附、标题/按钮字号与按钮视觉持续调优
- Blocksuite 描述文档 `tcHeader` 操作按钮去除 DaisyUI `btn` 依赖：使用 `tc-blocksuite-tc-header-btn` 自定义按钮样式，避免 blocksuite 运行时样式注入影响 DaisyUI 视觉
- Blocksuite 描述文档 `tcHeader` 样式改为运行时注入（`ensureBlocksuiteRuntimeStyles`）：避免 iframe 的 `blocksuiteFrame` 路由缺失 Tailwind/DaisyUI 样式导致布局退化
- Blocksuite 描述文档画布切换按钮收口到 `tcHeader` actions；移除外部 mode 控制入口（`hideModeSwitchButton`/`onActionsChange`），`blocksuite-frame` 不再支持 `set-mode`
- AI 生图测试页 `/ai-image`：Web 环境默认使用同源代理模式请求 NovelAI（Connection 可切换直连模式），并支持 img2img、本地历史与下载、更多生图参数（SMEA/qualityToggle 等）
- AI 生图页 `/ai-image` UI 重构：整体交互与样式分区对齐 `https://novelai.net/image`（Prompt/Undesired/Image/History/Connection）
- AI 生图页 `/ai-image` 再次重写：模型改为运行时拉取（失败自动降级），历史仅保留 IndexedDB；Electron 增加 `novelai:get-clientsettings` IPC；NovelAPI proxy 允许 `api.novelai.net`
- AI 生图页 `/ai-image`：token 为调试方便本地持久化；路由改为仅开发环境注册（生产不可访问）
- AI 生图页 `/ai-image` 双模式重构：普通模式（一行自然语言 + 单按钮出图，tags 可编辑再生成）+ 专业模式（三栏布局：参数/预览/历史）
- AI 生图页 `/ai-image`：连接设置收口到右上角“设置”弹窗（Token/Endpoint/请求方式）

### 修复
- 修复 chat 渲染与 BGM 悬浮球相关的 lint 规则警告
- 修复 blocksuite-frame（iframe）内 `tc_header` 图片上传不可用：补齐 `modal-root`，裁剪弹窗可正常打开并完成上传
- 修复打开空间文档导致全量加载空间内所有文档：移除 workspace 初始化阶段标题水合（不再逐个 `doc.load()`）；远端 doc source 在 pull 阶段不再触发写回（避免打开即 PUT）
- 修复编辑 `tcHeader` 导致 blocksuite iframe 反复重载：冻结 `blocksuite-frame` URL 中的 `tcHeaderTitle/tcHeaderImageUrl`（仅首次初始化/切换文档时传入）
- 修复 Blocksuite 空间描述 @ 提及重复插入：成员提及改为使用 `inlineEditor` 插入，并为 popover action 增加短窗口去重
- 修复 Blocksuite @ 提及重复渲染（`@鸠 @鸠 ...`）：提及插入改为写入 `ZERO_WIDTH_FOR_EMBED_NODE`（embed 节点）而非写入 `@displayName` 文本
- 修复 Blocksuite：`@` 弹窗用户候选仅显示 `userId`：改为拉取用户信息并展示头像/用户名
- 修复 Blocksuite：文档内 `@mention` 仅显示文本：通过自定义 `<affine-mention />` 组件让 mention 节点展示头像 + 用户名
- 优化 Blocksuite：文档内 mention 节点移除前缀 `@`（已展示头像+用户名，无需额外符号）
- 增强 Blocksuite @ 提及点击链路调试：在 frame 捕获 pointerdown/click，并在按下 `@` 后短窗口内上报事件路径摘要
- 增强 Blocksuite @ 提及宿主点击链路调试：收到 frame `keydown @` 后，宿主短窗口捕获 `pointerdown/click` 并输出事件路径摘要（用于定位 portal 到 iframe 外的候选项）
- 增强 Blocksuite @ 提及键盘确认调试：frame 与宿主在 `Enter` 时输出 activeElement/probe 信息，便于定位插入链路
- 补强 Blocksuite @ 提及调试日志：iframe 转发到宿主控制台，并增加入口日志
- 增加 Blocksuite @ 提及调试日志（菜单/插入路径）
- 加固空间描述 Blocksuite @ 提及弹窗关闭与重复触发
- 修复空间描述 Blocksuite @ 提及重复插入且弹窗不关闭
- 修复开发环境 React hooks 报错（invalid hook call / `useEffect` 为 null）：dev 启动清理遗留 `node_modules/.vite/`，并补充 `resolve.dedupe` 覆盖 `react/jsx-*`
- 修复开发环境偶发 Vite optimize deps 缓存/浏览器缓存不一致导致的 deps chunk 缺失报错：使用独立 `cacheDir`（`node_modules/.vite-tuan-chat-web`）并提供 `pnpm dev:force` 作为兜底命令
- 去掉构建期预渲染：关闭 `prerender`，用于排查/规避 React #418（hydration mismatch）
- BlockSuite 相关样式改为按需注入，并将 `@toeverything/theme` 的 `:root` 变量与 KaTeX 的全局 `body{counter-reset}` 重写为 `.tc-blocksuite-scope`/`.blocksuite-portal` 范围内生效
- 修复 Blocksuite 嵌入页面导致同页其它 UI 样式/交互被污染：在 blocksuite 初始化前注入作用域运行时样式，并通过 pnpm patch 将 overflow/cursor 等 `document.body.style` 副作用限制到 blocksuite scope/portal
- 修复 Blocksuite 嵌入场景仍可能出现“同页其它 UI 变化/二次进入样式失效”：默认改为 iframe 强隔离（新增 `blocksuite-frame` 路由），主窗口不再执行 blocksuite runtime
- 修复 SSR 评估阶段静态导入 Blocksuite workspace 依赖链导致的 `document is not defined`：Chat 页面订阅 doc metas 改为客户端 `import()` 动态加载 registry
- 修复 Chat 侧边栏“删除文档”触发 SSR 评估阶段静态导入 blocksuite runtime 导致的 `document is not defined`：`deleteSpaceDoc` 改为浏览器端 `import()` 动态加载 workspace registry
- 修复 Blocksuite iframe 嵌入场景“文档过长被截断/画布无法全屏”：iframe 自动上报高度，宿主按需调整；画布全屏由宿主提升为 `fixed inset-0` 覆盖主窗口
- 修复 Blocksuite 在房间设置/个人主页等嵌入场景“窗口过小不便阅读”：支持 `readOnly` 且保留滚动，并在相关入口改为 `variant="full"` 提供稳定视口高度
- 修复 Blocksuite iframe 宿主容器高度被 `h-full` 覆盖导致“窗口大小不生效”：当外部已传入 `h-* / min-h-* / max-h-*` 时不再追加 `h-full`
- 修复 Blocksuite `variant=full` 在 iframe 内 page 模式无法滚动导致“看起来像窗口不生效/内容被卡住”：page 模式改为 `overflow-auto`（edgeless 仍保持 `overflow-hidden`）
- 调整 Blocksuite 在个人主页/房间设置等场景默认使用 `variant=embedded` 自动高度，以便由外层页面滚动（如需固定高度再显式传入 `variant=full`）
- 优化 Blocksuite iframe 宿主 DOM：非全屏场景直接渲染 iframe，减少额外包裹层级，避免布局/高度被多层容器干扰
- 修复 Chat 抽屉宽度在 hydration 时不一致导致的警告：`drawerPreferenceStore` 延迟从 localStorage hydrate，`OpenAbleDrawer` 首屏统一按 `lg` 渲染避免 SSR/客户端屏幕尺寸分支不一致
- 为 `app/root.tsx` 的 `Layout` 增加默认 `data-theme="light"`，避免未挂载主题切换组件时 DaisyUI 主题变量缺失导致 UI 样式异常
- 统一包管理器为 pnpm：移除 `package-lock.json`，在 `package.json` 标注 `packageManager`，并在知识库中移除 npm/Docker 相关说明
- WebGAL 实时渲染创建游戏不再使用 `WebGAL Black` 模板（不传 `templateDir`），创建失败直接返回失败
- 修复房间列表右键菜单“房间资料”无法打开：为 `ChatPageContextMenu` 传入 `onOpenRoomSetting` 回调并跳转到房间资料页
- 修复房间列表分类展开“闪开闪关”：IndexedDB 异步读取展开状态时不再覆盖用户在读取完成前的手动展开操作
- 修复文档刷新后侧边栏文档节点丢失/重置默认无效：从 `/space/sidebarTree` 回补 doc metas，并回写 Blocksuite workspace meta 以保证可见/可打开
- 修复空间模式首次进入可能落到 `/chat/<spaceId>/null`：房间列表就绪后按自定义排序自动进入首个房间（并使用 `replace` 回填路由）
- 修复空间抽屉面板“跑团设置”打开后空白：`SpaceDetailPanel` 增加 `trpg` tab 渲染 `SpaceTrpgSettingWindow`
- 修复 ESLint 报错/告警：补全 Blocksuite 描述文档相关 `useEffect` 依赖；移除未使用的 Zustand `get` 参数；`/var set` 解析改为非正则解析避免回溯；`novelai-openapi.mjs` 显式引入 `node:process`
- 修复 Blocksuite `tcHeader` 双标题：使用自定义 `tc-affine-editor-container`（fork integration-test 容器）让 page 模式 `<doc-title>` 可选渲染，并在 specs 层过滤 `DocTitleViewExtension`
- 修复 AI 生图页运行时拉取模型列表的 502：`/user/*` 元数据接口固定走 `https://api.novelai.net`，避免误发到 `image.novelai.net`
- 修复 AI 生图页使用 `pst-*` token 拉取 `/user/clientsettings` 返回 403：检测到 persistent token 时直接降级为内置模型列表
- AI 生图页模型锁定为 NAI v4.5 Full：`nai-diffusion-4-5-full`（UI 的 “4.5 FULL” 对应该模型 ID）
- 修复 Web 环境同源代理连接超时导致的 502：AI 生图提供“直连”模式作为备选（可能被跨域/CORS 拦截）
- 修复部分环境（如 Windows 系统代理）下 `/api/novelapi/*` 未显式配置代理导致的 502：dev server 会自动读取系统代理（ProxyServer）作为兜底，并在 502 响应中附带底层 cause 便于排查
- 修复 `/api/novelapi/*` 同源代理偶发 500：流式转发改为使用 `pipeline` 并捕获异常，避免连接中断导致服务端崩溃
- 修复 AI 生图 NAI v4.5 Full 出图 500：对齐 NAI v4/v4.5 所需的 `params_version=3` 参数结构（`v4_prompt`/`v4_negative_prompt`）
- AI 生图：专业模式支持“背景/角色”分区编辑并写入 `v4_prompt`/`v4_negative_prompt` 的 `char_captions`；普通/专业统一三栏布局，并在历史记录中回填结构化 prompt
- AI 生图：普通模式参数面板精简为宽/高/Seed，修复“自然语言转换后生成提示 prompt 为空”的问题
- AI 生图：Seed 输入对齐 NovelAI（Seed < 0 表示随机）；普通模式补充可选负面 tags 输入
- AI 生图：普通模式移除 img2img，并新增“画风”多选（从本地图片加载预设并追加对应 tags）
- AI 生图：普通模式“画风”选择前置展示（无需先点击生成）
- AI 生图：普通模式选择画风后显示已选画风缩略图
- AI 生图：移除模式选择，固定为 txt2img
- AI 生图：普通模式生成时合并画风 tags 并写回 prompt（避免画风选择未生效）
- AI 生图：普通模式新增“自然语言一键出图”与“按 tag 出图”，并移除底部生成按钮
- 认证：HTTP 401 自动清理本地登录态并跳转到 `/login`（保留 redirect）；WS token 失效（type=100）同样引导重新登录
- 房间角色列表：`NPC+` 复用角色创建流程创建 NPC 并加入房间；角色头像弹窗复用角色页面详情（CharacterDetail）；并通过 `type=2 + spaceId` 绑定空间，自动进入空间 NPC 库（仍可从 NPC 库导入）
- 角色页（/role）：不再展示 NPC（`type=2`）；房间角色列表支持移除 NPC（权限同普通角色）
- 获取我的角色：改用 `GET /role/user/type`（type=0/1），避免 NPC 与用户角色混在一起
- 角色立绘：无 `spriteUrl` 时默认使用 `avatarUrl` 作为立绘来源（预览/校正/渲染）
- WebGAL：渲染时若消息未携带 `avatarId`，会回退到角色本身的 `avatarId`（角色头像）
- 默认不再加载 Google Fonts（Inter）外链样式，避免网络不可达时阻塞页面首屏渲染；如需启用可设置 `VITE_ENABLE_GOOGLE_FONTS=true`

### 移除
- 移除 Docker 相关文件（不再提供 Docker 构建链路）

### ??
- ?? @???? Deleted doc?workspace ???
- ?? @????? Deleted doc
- ?? @????????????
- ?? @??????????
## [1.0.0] - 2025-12-27

### 新增
- 初始化前端项目知识库（`helloagents/`）
