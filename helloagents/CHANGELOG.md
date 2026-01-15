# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/),
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 新增
- Blocksuite 描述文档支持自定义“图片 + 标题”头部（`tc_header`），并禁用 blocksuite 内置 `doc-title`；宿主侧支持乐观显示 room/space 标题与头像覆盖值
- Blocksuite 描述文档 `tcHeader` 新增“重置内置标题”按钮：一键清空 blocksuite 内置页面标题（用于修复历史文档的双标题/标题不一致）
- 新增 BlockSuite 学习路线文档：`app/components/chat/infra/blocksuite/doc/LEARNING-PATH.md`
- 新增 Blocksuite 依赖文档索引与包说明：`helloagents/wiki/vendors/blocksuite/`
- 新增 Quill 引用统计审计报告：`helloagents/wiki/reports/2026-01-14_quill_reference_audit.md`
- 跑团指令支持“检定请求按钮消息”：使用独立消息类型 `COMMAND_REQUEST(12)`；KP 发送包含 `@All` 的指令会生成可点击按钮，成员点击后以自身角色一键发送并在原 thread 执行
- WebGAL 实时预览设置支持配置 Terre 端口，并将 TTS/WebGAL 设置改为 IndexedDB 持久化
- WebGAL 空间变量系统：导演控制台支持“设置变量”发送 `WEBGAL_VAR(11)` 结构化消息（也支持 `/var set a=1` 快捷方式），变量持久化到 `space.extra.webgalVars` 并在实时渲染中转换为 `setVar:* -global;`
- Chat 房间列表：分类标题右侧新增“+”创建入口，可创建房间/文档并自动加入分类（持久化到 `/space/sidebarTree`）
- 新增 AI 生图测试页：`/ai-image`（Electron 主进程代理请求 NovelAI，便于本地调试）

### 变更
- 房间列表分类右侧“+”改为“标签页式”创建面板（参考邀请好友），同一弹窗内完成创建房间/文档
- 文档查看统一使用 Chat 内主视图（`/chat/:spaceId/doc/:docId`），兼容入口 `/doc/:spaceId/:docId` 改为跳转到 Chat 布局（保留侧边栏并支持当前文档高亮）
- sidebarTree 文档节点样式对齐房间：字号一致，并在标题前插入文档 icon
- WebGAL 空间变量设置入口支持“导演控制台 → 设置变量”，并保留 `/var set ...` 作为快捷方式
- 线索（space_clue）正文改为使用 BlockSuite 文档入口，线索创建/详情不再编辑 `description/note`（`note` 保留为兼容字段）
- 线索详情弹窗 UI 重构：默认全屏、更大文档视口，顶部固定基础信息/操作区，旧笔记默认折叠
- NovelAI OpenAPI 客户端目录去重：移除重复的 `novelai-api/`，规范文件迁移到 `api/novelai/api.json`
- Blocksuite 描述文档 `tcHeader` 标题样式重写（变量 fallback + `all: unset`），并在 tcHeader 模式下兜底隐藏 `<doc-title>`，避免与内置标题并存；同时加固 `disableDocTitle` 过滤逻辑（兜底按 extension name 匹配）
- Blocksuite 描述文档 `tcHeader` 头部样式重写：单行布局（图片 + 标题 + 操作按钮）、顶部 sticky 吸附、标题/按钮字号与按钮视觉持续调优
- Blocksuite 描述文档 `tcHeader` 操作按钮去除 DaisyUI `btn` 依赖：使用 `tc-blocksuite-tc-header-btn` 自定义按钮样式，避免 blocksuite 运行时样式注入影响 DaisyUI 视觉
- Blocksuite 描述文档 `tcHeader` 样式改为运行时注入（`ensureBlocksuiteRuntimeStyles`）：避免 iframe 的 `blocksuiteFrame` 路由缺失 Tailwind/DaisyUI 样式导致布局退化
- Blocksuite 描述文档画布切换按钮收口到 `tcHeader` actions；移除外部 mode 控制入口（`hideModeSwitchButton`/`onActionsChange`），`blocksuite-frame` 不再支持 `set-mode`
- AI 生图测试页 `/ai-image`：Web 环境默认直连请求 NovelAI（Connection 可切换同源代理模式），并支持 img2img、本地历史与下载、更多生图参数（SMEA/qualityToggle 等）
- AI 生图页 `/ai-image` UI 重构：整体交互与样式分区对齐 `https://novelai.net/image`（Prompt/Undesired/Image/History/Connection）
- AI 生图页 `/ai-image` 再次重写：模型改为运行时拉取（失败自动降级），历史仅保留 IndexedDB；Electron 增加 `novelai:get-clientsettings` IPC；NovelAPI proxy 允许 `api.novelai.net`
- AI 生图页 `/ai-image`：token 为调试方便本地持久化；路由改为仅开发环境注册（生产不可访问）

### 修复
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
- 修复 ESLint 报错/告警：补全 Blocksuite 描述文档相关 `useEffect` 依赖；移除未使用的 Zustand `get` 参数；`/var set` 解析改为非正则解析避免回溯；`novelai-openapi.mjs` 显式引入 `node:process`
- 修复 Blocksuite `tcHeader` 双标题：使用自定义 `tc-affine-editor-container`（fork integration-test 容器）让 page 模式 `<doc-title>` 可选渲染，并在 specs 层过滤 `DocTitleViewExtension`
- 修复 AI 生图页运行时拉取模型列表的 502：`/user/*` 元数据接口固定走 `https://api.novelai.net`，避免误发到 `image.novelai.net`
- 修复 Web 环境同源代理连接超时导致的 502：AI 生图提供“直连”模式（避免依赖 Node 转发），并保留同源代理作为备选

### 移除
- 移除 Docker 相关文件（不再提供 Docker 构建链路）

## [1.0.0] - 2025-12-27

### 新增
- 初始化前端项目知识库（`helloagents/`）
