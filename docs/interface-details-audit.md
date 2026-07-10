# interface-details 全量审查报告

更新时间：2026-07-06 09:24:08 +08:00

## 审查依据

- Skill：`detaildotdesign/skill` 安装后的 `interface-details`。
- 已读取章节：`SKILL.md`、`details/accessibility.md`、`details/interactivity.md`、`details/motion.md`、`details/design.md`、`details/typography.md`、`details/copywriting.md`、`details/easter-egg.md`。
- 定向扫描范围：`apps/web/app`、`apps/mobile/src`、`apps/desktop/src`、`apps/desktop/electron-builder.config.cjs` 中非测试、非生成、非构建产物的 UI 相关 TS/TSX/CSS/HTML/CJS。
- 当前候选附录：`docs/interface-details-candidate-appendix.md`，记录尚未进入人工报告的静态规则候选，不等同于已确认问题。

## 当前结论状态

- 机器扫描已经覆盖全仓 UI 代码，但包含大量误报；下方“已人工复核”才是高置信可修改细节。
- 本报告会继续追加，直到覆盖主要产品界面域：登录、聊天、私聊、消息编辑器、素材库、角色/立绘、AI 图片、移动端、桌面端与共享 UI。
- 产品折中记录：紧凑聊天区、移动输入区与密集工具栏优先保留可用空间；小型图标按钮或触达面积低于 44px 不再作为单独待办。若同一控件还缺真实按钮语义、可读标签、键盘入口、禁用态或危险操作保护，则仍保留为可修改细节。

## 待独立重构说明

- **统一上下文菜单控件**：`sidebarTreeOverlays`、`MomentDetailView`、`postsCard` 更多操作菜单等收敛为通用 ContextMenu（`role=menu` + 方向键 + Esc + 焦点回收）。当前各菜单项已为可键盘操作的 `<button>`，删除类操作均有带影响说明的确认弹窗。
- **统一 Modal / Dialog + 焦点陷阱**：部分手写弹窗本轮仅补 dialog 语义与 Esc；完整焦点陷阱与关闭后焦点回收建议收敛到共享组件。
- **拖拽的键盘等价路径**：素材树 / 线索 / 文档 / 房间 / 消息 / 立绘等 `draggable` 排序节点，本轮补了 aria-label / 拖拽提示 title，键盘重排（上移 / 下移 / 移动到菜单）属新功能，建议独立实现；AI 图片侧栏宽度分隔条同理（已有 label/title，方向键调整宽度属增强）。
- **纯 motion / design 条目**：reduced-motion 降级、`hidden-scrollbar` 拆分、favicon light / dark、打包图标等属 motion / design 范畴，不在本轮 typography / accessibility / copywriting 范围。

## 静态扫描说明

历史机器扫描统计已移除，避免把原始候选数量误读为当前待办数量。当前报告只保留下方“已人工复核”的高置信可修改细节。

## 已人工复核：高优先级可修改细节

### 素材库 / 素材包

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ⏳ `apps/web/app/components/material/components/materialPackageWorkbench.tsx:523` | `accessibility-12` | 素材树节点用 button 承载点击选择，但同时 `draggable`；键盘用户缺少等价的“移动/重排”路径。 | 对可重排节点补键盘重排操作，或提供菜单项“上移/下移/移入文件夹”。 |
| ⏳ `apps/web/app/components/material/components/materialPackageWorkbench.tsx:1062` | `accessibility-12` | 只读素材卡外层 `div draggable={canDrag}`，没有键盘等价的拖拽/发送路径。 | 为素材卡提供显式按钮或上下文菜单，例如“发送到群聊”“加入副窗口”。 |
| ⏳ `apps/web/app/components/material/components/materialPackageWorkbench.tsx:1080` | `accessibility-12` | 可编辑素材卡同样依赖 HTML drag，键盘路径不明显。 | 保留拖拽，同时增加菜单或按钮形式的移动/复制操作。 |

### AI 图片 / Inpaint

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ⏳ `apps/web/app/components/aiImage/history/DirectorHistoryPanel.tsx:129` | `accessibility-12` | 当前结果卡是 button 但也 `draggable`，键盘用户缺少等价的拖入参考/素材路径。 | 给历史图增加显式操作菜单，例如“设为参考图”“下载”“删除”，不要只依赖拖拽。 |

### 角色 / 立绘 / 规则编辑

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ⏳ `apps/web/app/components/Role/sprite/Tabs/SpriteListGrid.tsx:308` | `accessibility-12` | 头像 tile 是 button，但同时依赖 `draggable` 做排序；键盘用户缺少等价重排路径。 | 增加菜单或快捷按钮：上移、下移、移入分组、设为默认；保留 drag 作为指针增强。 |

### Web 路由 / 反馈 / 媒体预览

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| `apps/web/app/components/activities/ImagePreview.tsx:113` | `motion-15/accessibility-2` | 图片旋转使用内联 `transition: "transform 0.3s ease-in-out"`，不受全局 reduced-motion class 约束。 | 根据 reduced-motion 偏好禁用 transform transition，或迁移到带 `motion-reduce:transition-none` 的 class。 |
| ⏳ `apps/web/app/components/activities/MomentDetailView.tsx:210` | `accessibility-12` | 自绘下拉菜单缺少 Esc 关闭、外部点击关闭和 menuitem 语义证据。 | 抽成通用 Dropdown/Menu，支持键盘方向键、Esc 和焦点回收。 |
| `apps/web/app/components/chat/chatPageModals.tsx:149` | `design-6`, `design-7` | 创建分类弹窗主内容区和文档信息区都使用 `hidden-scrollbar`，这是长表单/长内容区域，滚动 affordance 被隐藏。 | 长表单区域改用低对比细滚动条；只在短横向工具条保留隐藏滚动条。 |
| `apps/web/app/components/common/scrollbar.css:1` | `design-6`, `design-7` | `.hidden-scrollbar` 是全局 utility，任何调用都会完全隐藏主轴滚动条，容易被误用到长列表和弹窗。 | 拆成 `hidden-scrollbar-short` 与 `subtle-scrollbar` 两类，长列表默认使用可见细滚动条。 |

### Web 聊天长尾 / 空间配置

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| `apps/web/app/components/aiImage/preview/StandardPreviewWorkspace.tsx:125` | `motion-15/accessibility-2` | 忙碌状态顶部 `animate-pulse` 信息条未见 reduced-motion 降级。 | 在 reduced-motion 下禁用 pulse，改用静态进度条和 `aria-busy`。 |
| ⏳ `apps/web/app/components/chat/room/roomSidebarMaterialPackageItem.tsx:123` | `accessibility-12` | 素材节点按钮同时支持点击、键盘与 `draggable`，但拖拽没有键盘等价路径。 | 为素材节点增加菜单操作：发送、移动到、复制路径、移入子窗口；保留 drag 作为增强。 |
| ⏳ `apps/web/app/components/chat/clues/clueFolderSidebar.tsx:425` | `accessibility-12` | 线索卡片是 button 但也承担拖拽/重排，键盘用户缺少等价的移动排序路径。 | 增加“上移/下移/移动到文件夹”菜单或快捷按钮。 |
| `apps/web/app/components/chat/window/createSpaceWindow.tsx:262` | `motion-15/accessibility-2` | 空间头像 hover 使用 `group-hover:scale-105` 与 brightness 变化，未见 reduced-motion。 | 加 `motion-reduce:scale-100 motion-reduce:transition-none`。 |
| `apps/web/app/components/chat/window/createSpaceWindow.tsx:357` | `design-6`, `design-7` | 创建空间主内容区使用 `hidden-scrollbar`，这是长表单区域，滚动条完全隐藏。 | 改为低对比细滚动条，避免用户不知道还有初始对话/规则/骰娘配置。 |
| `apps/web/app/components/repository/home/RepositoryHome.tsx:608` | `motion-15/accessibility-2` | 加载骨架使用 `animate-pulse`，未见 reduced-motion 降级，也没有 `aria-busy` 包裹列表。 | reduced-motion 下禁用 pulse；列表容器加 `aria-busy={repositoryList.isLoading}`。 |
| ⏳ `apps/web/app/components/chat/room/sidebarTreeOverlays.tsx:188` | `accessibility-12` | 右键菜单覆盖层是 `fixed inset-0` + 绝对按钮关闭，菜单项缺 menu/menuitem 语义和键盘方向键支持证据。 | 收敛为通用 ContextMenu：`role="menu"`、`menuitem`、Esc/方向键、关闭后焦点回收。 |
| `apps/web/app/components/chat/window/addMemberWindow.tsx:209` | `design-6`, `design-7` | 成员选择主内容、好友列表、搜索结果和左右栏多处使用 `hidden-scrollbar`，属于长列表/长内容区域。 | 长列表改用细滚动条或 fade edge；`hidden-scrollbar` 仅保留给短横向工具条。 |
| ⏳ `apps/web/app/components/common/acticityAndFeedPostsCard/postsCard.tsx:274` | `interactivity-20`, `copywriting-7` | 删除动态是高影响操作，菜单里直接触发 `handleDelete`，片段未看到确认、撤销或影响说明。 | 删除前确认并说明会移除动态/评论；若已删除可提供短时撤销。 |
| `apps/web/app/components/aiImage/AiImageWorkspace.tsx:176` | `motion-15/accessibility-2` | 历史侧栏收起/展开使用宽度、位移和透明度 transition，未见 reduced-motion 分支。 | 给历史侧栏切换补 `motion-reduce:transition-none motion-reduce:transform-none`。 |
| `apps/web/app/components/chat/discover/discoverArchivedSpacesView.tsx:466` | `motion-15/accessibility-2` | 归档列表 loading skeleton 使用 `animate-pulse`，未见 reduced-motion 降级。 | reduced-motion 下禁用 pulse，并在列表容器补 `aria-busy`。 |
| ⏳ `apps/web/app/components/chat/chatFrameMessageItem.tsx:147` | `accessibility-12`, `interactivity-3` | 消息移动依赖 HTML drag，虽然有拖拽按钮，但未见键盘等价移动路径。 | 为多选移动提供“上移/下移/移动到上下文”菜单或快捷按钮。 |
| `apps/web/app/components/aiImage/sidebar/ProBottomSettingsDrawer.tsx:146` | `motion-15/accessibility-2` | AI 设置抽屉使用 `transition-all duration-300` 展开收起，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，避免高度/位移动画。 |
| `apps/web/app/components/chat/shared/components/memberLists.tsx:310` | `motion-15/accessibility-2` | 成员操作菜单使用 `animate-fadeIn`，未见 reduced-motion 降级。 | reduced-motion 下禁用 fade 动画。 |
| `apps/web/app/components/chat/space/chatSpaceSidebar.tsx:313` | `design-6`, `design-7` | 空间列表容器使用 `hidden-scrollbar`，这是主要纵向导航区，滚动 affordance 被隐藏。 | 改为低对比细滚动条，或增加上下 fade edge 表示可滚动。 |
| `apps/web/app/components/chat/window/createRoomWindow.tsx:125` | `design-6`, `design-7` | 建房窗口主内容使用 `hidden-scrollbar`，是长表单区域，用户可能不知道下面还有初始对话设置。 | 长表单使用可见细滚动条或 fade edge，不要完全隐藏主轴滚动条。 |
| `apps/web/app/components/chat/window/createRoomWindow.tsx:152` | `motion-15/accessibility-2` | 房间头像 hover 使用 scale/brightness/blur 组合动效，未见 reduced-motion 降级。 | 加 `motion-reduce:scale-100 motion-reduce:transition-none`，保留颜色变化即可。 |
| `apps/web/app/components/chat/message/roomJump/roomJumpMessage.tsx:184` | `motion-15/accessibility-2` | 跳转卡片 hover overlay 使用 opacity/transform transition，未见 reduced-motion 降级。 | reduced-motion 下禁用 hover 位移/透明度动画。 |
| `apps/web/app/components/chat/chatPageSubWindow.tsx:424` | `motion-15/accessibility-2` | 副窗口右边缘拖拽把手使用 `transition-all`、位移和 opacity，未见 reduced-motion 降级。 | 在 reduced-motion 下禁用位移/透明度动画，只保留静态把手。 |
| ⏳ `apps/web/app/components/chat/room/roomSidebarDocItem.tsx:129` | `accessibility-12`, `interactivity-3` | 文档排序依赖 `draggable`，未见键盘等价重排或移动到分类路径。 | 增加“移动到分类 / 上移 / 下移”菜单，拖拽只作为增强。 |
| `apps/web/app/components/chat/room/roomWindowLayout.tsx:123` | `motion-15/accessibility-2` | 房间背景、遮罩和内容层使用多段 `transition-all/transition-opacity duration-500`，只有部分 motion transition 显式检查 reduced-motion。 | 背景/遮罩 CSS transition 也补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/privateChat/components/ChatItem.tsx:191` | `interactivity-7`, `interactivity-20` | PC 删除会话按钮默认 hover/focus 才出现，且删除会话是高影响操作。 | 提供稳定更多菜单入口；删除前确认或提供撤销，说明只删除本地会话还是会影响双方记录。 |
| `apps/web/app/components/Role/sprite/Tabs/AvatarSettingsTab.tsx:207` | `motion-15/accessibility-2` | 头像设置卡片 hover overlay 使用 opacity/背景 transition，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，减少 hover 过渡。 |
| `apps/web/app/components/aiImage/PreviewImageDialog.tsx:54` | `motion-15/accessibility-2` | 图片预览遮罩和内容使用 opacity/translate/scale transition，未见 reduced-motion 降级。 | reduced-motion 下禁用位移/缩放，只保留即时显隐。 |
| `apps/web/app/components/material/components/materialPackageLibraryFrame.tsx:74` | `motion-4`, `accessibility-2` | 素材库侧栏折叠按钮和侧栏都用 300ms transition，未见 reduced-motion 降级；这是高频布局切换。 | 加 `motion-reduce:transition-none`，图标可保持静态方向或只更新状态。 |
| `apps/web/app/components/aiImage/history/HistoryImageTile.tsx:58` | `motion-15/accessibility-2` | 缩略图 hover 放大 `scale-[1.02]`，历史列表是高频浏览区域，未见 reduced-motion 降级。 | 加 `motion-reduce:transform-none motion-reduce:transition-none`，保留静态边框高亮。 |
| `apps/web/app/components/chat/message/docCard/docCardMessage.tsx:55` | `motion-15/accessibility-2` | 文档卡 hover 阴影 transition 用于聊天消息列表，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，高频滚动列表保留静态 hover 状态即可。 |
| `apps/web/app/components/Role/RuleEditor/RulePerformanceEditor.tsx:197` | `motion-15/accessibility-2` | 表演编辑卡用 `transition-opacity duration-300` 表达编辑状态，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，编辑状态主要靠 ring 和按钮文案表达。 |
| `apps/web/app/components/chat/window/spaceWebgalRenderWindowParts.tsx:131` | `motion-4`, `motion-15/accessibility-2` | 分区展开按钮的图标旋转与 panel 展开一致，但 `transition-transform duration-200` 未见 reduced-motion 降级。 | 补 `motion-reduce:transition-none`，减少高频展开/收起动效。 |
| `apps/web/app/components/material/components/materialMessageEditorCard.tsx:243` | `interactivity-20` | 删除素材条目会直接从当前素材消息列表移除，没有确认或撤销路径。 | 删除前确认，或提供撤销 toast；保留当前紧凑悬浮工具栏尺寸。 |
| `apps/web/app/components/Role/RoleCreation/CreateDicerRole.tsx:59` | `motion-15/accessibility-2` | 保存中用 `transition-opacity duration-300` 和整体 opacity 表达状态，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，并用按钮 busy/禁用状态表达保存中。 |
| `apps/web/app/components/Role/RuleEditor/RuleNumericalEditor.tsx:184` | `motion-15/accessibility-2` | 数值编辑卡与表演编辑卡同样用 opacity transition 表达编辑状态，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，状态变化主要保留 ring 和按钮文案。 |
| `apps/web/app/components/chat/message/media/AudioMessage.tsx:903` | `motion-15/accessibility-2` | 音频播放/删除按钮使用 transition hover，在聊天消息中是高频控件，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，保留静态 hover 颜色。 |
| `apps/web/app/components/chat/window/addNpcRoleWindow.tsx:58` | `motion-15/accessibility-2` | NPC 卡片 hover 阴影 transition 未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，列表卡片保留静态 hover 阴影或边框即可。 |
| `apps/web/app/components/messageEditor/components/MessageEditorSpeakerMenu.tsx:70` | `motion-15/accessibility-2` | 候选项使用 motion 进入动画和 hover transition，作为编辑器高频菜单未见 reduced-motion 降级证据。 | reduced-motion 下禁用列表项位移/渐入，只保留即时显示和静态高亮。 |
| `apps/web/app/components/chat/discover/chatDiscoverNavPanel.tsx:11` | `motion-15/accessibility-2` | 发现导航高频切换项使用 `transition-colors`，未见 reduced-motion 降级。 | 给导航基类补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/common/toastWindow/toastWindowFrame.tsx:67` | `motion-15/accessibility-2` | 通用弹窗固定 opacity/scale 动画，未见 `prefers-reduced-motion` 降级。 | 接入 reduced-motion，降级为仅 opacity 或即时显隐。 |
| `apps/web/app/components/common/toastWindow/toastWindowFrame.tsx:84` | `design-6`, `design-7` | `hiddenScrollbar` 会完全隐藏弹窗内容滚动条，长内容弹窗可能失去滚动 affordance。 | 仅短横向内容隐藏滚动条；长内容弹窗使用低对比细滚动条。 |
| `apps/web/app/components/material/components/materialPackageEditor.tsx:312` | `motion-15/accessibility-2` | 保存/额外动作按钮 hover 会位移 `-translate-y-0.5`，未见 reduced-motion 降级。 | 加 `motion-reduce:transform-none motion-reduce:transition-none`。 |
| `apps/web/app/components/common/acticityAndFeedPostsCard/postsCardComponents/RepositoryContentCard.tsx:31` | `motion-15/accessibility-2` | 仓库卡片使用 `transition-all` 和 hover shadow，未见 reduced-motion 降级。 | 改为具体 transition 属性，并加 `motion-reduce:transition-none`。 |
| ⏳ `apps/web/app/routes/_dashboard/ai-image.tsx:245` | `interactivity-3`, `accessibility-12` | 侧边栏宽度调整只有 pointer drag，虽然有 label/title，但未见键盘调整路径。 | 给分隔条补左右方向键调整宽度，或提供可输入宽度/重置按钮。 |
| `apps/web/app/components/chat/window/spaceTrpgSettingWindow.tsx:310` | `motion-15/accessibility-2` | 骰娘关联卡片使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改为具体 transition 并加 `motion-reduce:transition-none`。 |
| `apps/web/app/components/profile/cards/userRoleCard.tsx:26` | `motion-15/accessibility-2` | 用户角色卡 hover 上移和阴影使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改为具体 transform/shadow transition，并加 `motion-reduce:transform-none motion-reduce:transition-none`。 |
| `apps/web/app/components/profile/workTabPart/repositoryList.tsx:84` | `motion-15/accessibility-2` | 仓库列表骨架屏使用 `animate-pulse`，未见 reduced-motion 降级。 | reduced-motion 下禁用 pulse，改为静态骨架。 |
| `apps/web/app/components/Role/Preview/displayChatBubble.tsx:250` | `motion-15/accessibility-2` | 气泡预览角色名和内容使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改为具体属性 transition，并补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/Role/RoleInfoCard/CharacterAvatar.tsx:89` | `motion-15/accessibility-2` | 可编辑头像 hover 放大和 overlay `transition-all` 未见 reduced-motion 降级。 | 加 `motion-reduce:transform-none motion-reduce:transition-none`，overlay 只做静态显隐。 |
| `apps/web/app/components/Role/RoleSidebarActionCard.tsx:28` | `motion-15/accessibility-2` | 动作卡片和内部按钮使用 transition，未见 reduced-motion 降级。 | 给卡片和按钮补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/chat/state/stateMessageCard.tsx:13` | `motion-15/accessibility-2` | 状态消息卡和展开按钮使用 transition，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，高频消息列表里保留静态颜色变化。 |
| `apps/web/app/components/chat/window/spaceSettingWindow.tsx:307` | `motion-15/accessibility-2` | 空间头像预览使用 `transition`、`group-hover:scale-105` 和亮度变化，未见 reduced-motion 降级。 | 给图片和遮罩补 `motion-reduce:transition-none motion-reduce:group-hover:scale-100`。 |
| `apps/web/app/components/common/userAvatar.tsx:260` | `motion-15/accessibility-2` | 用户资料卡弹层使用 `animate-in fade-in zoom-in duration-150`，未见 reduced-motion 降级。 | 补 `motion-reduce:animate-none motion-reduce:transition-none`。 |
| `apps/web/app/components/repository/create/components/RepositoryCoverImage.tsx:56` | `motion-15/accessibility-2` | 封面上传区域和 hover 遮罩使用 transition，未见 reduced-motion 降级。 | 补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/repository/create/RepositoryCreateMain.tsx:58` | `motion-15/accessibility-2` | 创建仓库提交按钮使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改成必要属性 transition 或补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/profile/workTabPart/rolesList.tsx:46` | `motion-15/accessibility-2` | 角色作品骨架屏使用 `animate-pulse`，未见 reduced-motion 降级。 | 给 skeleton 补 `motion-reduce:animate-none`。 |
| `apps/web/app/components/common/message/message.tsx:67` | `motion-15/accessibility-2` | 全局消息 toast 使用 `fade-in-out transition-all duration-300`，未见 reduced-motion 降级。 | 对消息节点增加 reduced-motion class 或按媒体查询关闭 fade 动画。 |
| `apps/web/app/components/privateChat/components/MessageBubble.tsx:145` | `motion-15/accessibility-2` | 私聊消息时间浮层使用 opacity/transform transition，未见 reduced-motion 降级。 | 补 `motion-reduce:transition-none motion-reduce:translate-y-0`。 |
| `apps/web/app/components/common/resizableImg.tsx:324` | `motion-15/accessibility-2` | 可缩放图片 transform 使用内联 `transition: transform 0.2s ease-out`，无法通过 Tailwind reduced-motion 自动降级。 | 读取 reduced-motion 偏好后关闭内联 transition。 |
| `apps/web/app/components/Role/roleRouteStyles.css:13` | `motion-15/accessibility-2` | 角色路由 `animate-scale-in` 和 avatar connector keyframes 未见 `prefers-reduced-motion` 降级。 | 在 CSS 中为 reduced-motion 禁用 scale/line draw 动画。 |

### 移动端

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| `apps/mobile/src/features/chat/ChatNewMessagesPill.tsx:35` | `motion-15/accessibility-2` | `withTiming` 固定执行 opacity/scale 动画，未读取 reduced-motion 偏好。 | 使用 Reanimated reduced-motion 支持或系统偏好分支；reduce 时保留显隐但取消 scale。 |
| `apps/mobile/src/features/notifications/ForegroundNotificationBanner.tsx:53` | `motion-15/accessibility-2` | 前台通知横幅使用 Reanimated `SlideInUp/SlideOutUp` 固定滑入/滑出，未读取 reduced-motion。 | reduce 时改为静态出现/消失或短淡入，避免系统“减少动态效果”下仍大幅滑动。 |

### 全局 polish / 浏览器 chrome / 桌面壳

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| `apps/web/index.html:10` | `design-9` | 当前只声明 `/favicon.ico`，未看到 light/dark favicon 变体。 | 增加 `favicon-light.svg` / `favicon-dark.svg` 并用 `prefers-color-scheme` media 区分。 |
| `apps/web/app/components/common/textEnhanceAnimations.css:12` | `motion-15/accessibility-2` | 文本增强提供大量循环 keyframes，作为用户生成内容效果时可能持续播放；文件内未看到 reduced-motion 包裹。 | 在 CSS 中为 `prefers-reduced-motion: reduce` 提供禁用/降级策略，或渲染层按用户偏好过滤循环动画。 |
| `apps/web/app/components/common/scrollbar.css:1` | `design-6`, `design-7` | 多处使用 `hidden-scrollbar` 完全隐藏滚动条；在长列表/弹窗中可能损失滚动 affordance。 | 对主要内容滚动区优先使用低对比细滚动条；只在短横向 chip/list 中隐藏。 |

## 后续待复核队列

1. Web 角色详情剩余弹窗：骰娘关联、角色创建/编辑相关弹窗可统一 Modal 化。
2. 移动端其它页面：动态/探索列表、地图 token 详情、通知设置诊断卡继续抽查。
3. Electron 专属体验：系统通知、下载进度可视化、平台快捷键与安装包图标资产落地继续复核。
4. 全局长列表：继续把 `hidden-scrollbar` 调用点分成“短工具条”和“主要内容滚动区”。
