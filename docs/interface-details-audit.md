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

## 本轮修复状态（2026-07-10）

针对本报告中 typography / accessibility / copywriting 相关条目完成一轮修复。下方“已人工复核”各表格已逐行标注：✅ 已修复 / ⏳ 暂缓（属独立重构，本轮补了 aria-label/拖拽提示）/ ➖ 核对后已合规无需改动；纯 motion / design / interactivity 条目未标，不在本轮范围。各分类汇总与验收结果见下方小节。

### 验收结果

- `pnpm typecheck:web`：通过（0 错误）。
- `pnpm typecheck:mobile`：通过（0 错误）。
- `pnpm lint:web`：0 错误（218 warning 均为仓库既有的 `appToast` import 排序问题，与本轮无关）。
- `pnpm lint:mobile`：0 错误（8 条既有 import 排序/未用变量 warning）。
- `pnpm lint:desktop`：0 错误。

### 已完成 ✅

- **typography-2 / accessibility-8（截断文本可读性）**：对 truncate / line-clamp / numberOfLines 的展示元素补 `title` / 完整 `accessibilityLabel`；对“整卡 button 内 clamp”改为给按钮补动作 title、给内部 clamp 子元素补完整 title（不覆盖可访问名）。覆盖角色名、房间名、空间名、规则名、动态正文、文档卡、仓库卡、用户角色卡、@候选、搜索结果、归档标题、WebGAL 房间状态、说话人菜单等。
- **accessibility-11（图片 alt 与稳定 label）**：头像 / 裁剪图 / inpaint 源图 alt 中文化并含角色名 / 用户名；placeholder 承载说明的输入补 aria-label / 可见 label + 简短帮助文本（立绘组名、工作流条件、WebGAL 配置、仓库表单、AI 生成、角色简介）。
- **accessibility-12（按钮 / 键盘语义）**：可点击 div / span 补 `role="button"` + `tabIndex` + `onKeyDown`（Enter / Space）或改为原生 `<button>`；图标按钮补中文 `aria-label` / `title`；指令建议补 `role="option"` + `aria-selected`；评论入口、角色名编辑、规则卡、搜索结果、场景节点等。
- **copywriting-1 / 7 / 9（文案）**：英文 label / title / alt 统一中文（AI 设置、seed、Upscale、固定预览、Personal / Space Library、活动卡）；空态 / 入口补可执行下一步（素材包描述、NPC 空 / 导入、创建入口目标范围）；确认 / 错误 / 等待文案补对象名与影响范围（解散空间 / 房间、踢出角色、删除动态 / 文档 / 历史图、邀请处理、文本差异、验证码发送 aria-live）。
- **弹窗 / 对话框语义**：手写遮罩弹窗补 `role="dialog" aria-modal` + Esc 关闭（骰娘关联、音频上传、规则选择、ST 指令、WebGAL 选项、线索、裁剪等）；`AccountSecurityModal` 已由共享 Modal 覆盖；`toastWindowFrame` 支持可选 `ariaLabel`。
- **桌面端**：更新下载后提供“立即重启 / 稍后”选择并带版本号；窗口补标题 / 背景色 / 图标；恢复最小应用菜单（编辑 / 视图 / 窗口 / 帮助，含检查更新），`autoHideMenuBar` 避免常驻菜单栏，复制 / 粘贴等加速键恢复。
- **移动端**：Pressable 补 `accessibilityRole / Label / Hint / State`，截断文本父级补完整 `accessibilityLabel`（搜索、聊天项多选 / 回复、地图 token、表情、战斗属性、头像网格、通知诊断 / 引导、底部弹窗把手等）。

### 暂缓（需独立重构，非“细节”级改动）⏳

- **统一上下文菜单控件**：`sidebarTreeOverlays`、`MomentDetailView`、`postsCard` 更多操作菜单等收敛为通用 ContextMenu（`role=menu` + 方向键 + Esc + 焦点回收）。当前各菜单项已为可键盘操作的 `<button>`，删除类操作均有带影响说明的确认弹窗。
- **统一 Modal / Dialog + 焦点陷阱**：部分手写弹窗本轮仅补 dialog 语义与 Esc；完整焦点陷阱与关闭后焦点回收建议收敛到共享组件。
- **拖拽的键盘等价路径**：素材树 / 线索 / 文档 / 房间 / 消息 / 立绘等 `draggable` 排序节点，本轮补了 aria-label / 拖拽提示 title，键盘重排（上移 / 下移 / 移动到菜单）属新功能，建议独立实现；AI 图片侧栏宽度分隔条同理（已有 label/title，方向键调整宽度属增强）。
- **纯 motion / design 条目**：reduced-motion 降级、`hidden-scrollbar` 拆分、favicon light / dark、打包图标等属 motion / design 范畴，不在本轮 typography / accessibility / copywriting 范围。

### 核对后已合规（无需改动）➖

`chatToolbar` 发送 / 模式按钮已有 aria-label 且为原生 button；`sidebarSection` 头部为 button 且 action 带 aria-label / focus-visible；`roomButton` 已有动态 aria-label / title；`roomSidebarItemMenuButton` 已有 aria-label / title / focus-within；`roomSidebarDocItem` 已有 role=button / tabIndex / onKeyDown；`DNDMap` 清空已有确认弹窗（含影响说明）+ aria-label；`chatPageSubWindow` 拖拽把手已有 aria-label / title。

## 静态扫描说明

历史机器扫描统计已移除，避免把原始候选数量误读为当前待办数量。当前报告只保留下方“已人工复核”的高置信可修改细节。

## 已人工复核：高优先级可修改细节

### 抽屉 / 分栏调整

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |

### 消息编辑器

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |

### Modal / 覆层

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ✅ `apps/web/app/components/Role/DiceMaidenLinkModal.tsx:184` | `accessibility-12` | 遮罩 `div onClick` 关闭弹窗，缺少 dialog 语义、Esc/focus trap 证据。 | 优先复用现有 Modal 组件；至少补 `role="dialog" aria-modal`、Esc 关闭与焦点管理。 |

### Web 主聊天 / 输入工具栏

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ➖ `apps/web/app/components/chat/input/chatToolbar.tsx:509` | `accessibility-12`, `accessibility-7`, `interactivity-21` | 堆叠布局下发送按钮复用了同样的 icon-only click pattern，移动端更容易出现命中区不足与不可键盘操作。 | 与非堆叠布局统一成同一个可访问按钮组件，保证最小 44px 触达区。 |

### 聊天气泡 / 消息列表

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ✅ `apps/web/app/components/chat/message/chatBubble.tsx:1371` | `accessibility-12`, `typography-2/accessibility-8` | 角色名是 clickable `span`，支持点击/双击编辑但无键盘入口；同时 `truncate` 后没有明显 full-text affordance。 | 改成 button 或补 `role/button/tabIndex/onKeyDown`；为截断角色名补 `title` 或 tooltip。 |
| ✅ `apps/web/app/components/chat/message/chatBubble.tsx:1613` | `accessibility-12`, `typography-2/accessibility-8` | 另一套消息布局也用 clickable `div` 处理角色名，存在同样的键盘与截断问题。 | 抽成统一的 `RoleNameTrigger`，一次性补键盘、tooltip 和命中区。 |

### 素材库 / 素材包

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ⏳ `apps/web/app/components/material/components/materialPackageWorkbench.tsx:523` | `accessibility-12` | 素材树节点用 button 承载点击选择，但同时 `draggable`；键盘用户缺少等价的“移动/重排”路径。 | 对可重排节点补键盘重排操作，或提供菜单项“上移/下移/移入文件夹”。 |
| ⏳ `apps/web/app/components/material/components/materialPackageWorkbench.tsx:1062` | `accessibility-12` | 只读素材卡外层 `div draggable={canDrag}`，没有键盘等价的拖拽/发送路径。 | 为素材卡提供显式按钮或上下文菜单，例如“发送到群聊”“加入副窗口”。 |
| ⏳ `apps/web/app/components/material/components/materialPackageWorkbench.tsx:1080` | `accessibility-12` | 可编辑素材卡同样依赖 HTML drag，键盘路径不明显。 | 保留拖拽，同时增加菜单或按钮形式的移动/复制操作。 |
| ✅ `apps/web/app/components/material/components/materialPackageLibraryWorkspace.tsx:123` | `copywriting-9` | 素材包卡片无描述时显示“暂无描述”，只说明缺失，没有给出可执行下一步。 | 对可编辑/自有素材包显示“添加一句描述，方便搜索和复用”；只读外部包可保留简短缺失态。 |

### AI 图片 / Inpaint

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ⏳ `apps/web/app/components/aiImage/history/DirectorHistoryPanel.tsx:129` | `accessibility-12` | 当前结果卡是 button 但也 `draggable`，键盘用户缺少等价的拖入参考/素材路径。 | 给历史图增加显式操作菜单，例如“设为参考图”“下载”“删除”，不要只依赖拖拽。 |
| ✅ `apps/web/app/components/aiImage/history/HistoryImageTile.tsx:44` | `accessibility-12`, `design-3` | 历史图片 tile 支持 click + drag，但 drag 的等价操作不明显；图片边界依赖普通容器 border，图像边缘可能偏硬。 | 保留 click 预览，补 action menu；图片边缘可用 inset ring 替代硬 border。 |
| ✅ `apps/web/app/components/aiImage/InpaintDialog.tsx:978` | `accessibility-12`, `interactivity-3` | Inpaint 画布核心操作是 pointer drawing，键盘/无精细指针用户没有替代路径。 | 提供基础键盘辅助：缩放/平移按钮、清空 mask、反选/全选 mask，或至少明确画布操作说明与按钮替代。 |

### 角色 / 立绘 / 规则编辑

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ⏳ `apps/web/app/components/Role/sprite/Tabs/SpriteListGrid.tsx:308` | `accessibility-12` | 头像 tile 是 button，但同时依赖 `draggable` 做排序；键盘用户缺少等价重排路径。 | 增加菜单或快捷按钮：上移、下移、移入分组、设为默认；保留 drag 作为指针增强。 |
| ✅ `apps/web/app/components/Role/RoleInfoCard/AudioUploadModal.tsx:143` | `accessibility-12` | 音频上传弹窗手写遮罩 `div onClick` 关闭，未看到 dialog 语义、Esc/focus trap。 | 复用现有 Modal/Dialog 基础组件，或补 `role="dialog" aria-modal`、Esc 关闭与焦点管理。 |
| ✅ `apps/web/app/components/Role/CharacterDetail.tsx:612` | `accessibility-12` | 规则选择弹窗同样手写遮罩和内容容器，缺少统一 dialog 语义证据。 | 与音频上传、骰娘关联弹窗一起收敛到统一 Modal。 |
| ✅ `apps/web/app/components/Role/RoleCreation/CreateEntry.tsx:58` | `copywriting-9` | 入口描述“创建普通游戏角色”“创建跑团骰娘”说明对象，但没有交代下一步会进入表单/模板选择。 | 文案补足行动结果，例如“进入资料表单并配置头像、规则与表演字段”。 |

### Web 路由 / 反馈 / 媒体预览

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ✅ `apps/web/app/routes/invite/$code.tsx:121` | `copywriting-7`, `copywriting-9` | “正在处理邀请……请稍等”没有说明失败后可重试或加入的是哪个空间，用户等待时缺少上下文。 | 若接口能取到邀请摘要，展示空间/邀请人；否则补“失败后可重试或返回首页”。 |
| ✅ `apps/web/app/components/activities/ImagePreview.tsx:100` | `accessibility-12` | 放大图片区域用 `div onClick` 承载上一张/下一张切换，左右热区只是 hover 渐显，没有键盘按钮语义。 | 改为真实上一张/下一张 button，支持 `ArrowLeft/ArrowRight`，并给热区 `aria-label`。 |
| `apps/web/app/components/activities/ImagePreview.tsx:113` | `motion-15/accessibility-2` | 图片旋转使用内联 `transition: "transform 0.3s ease-in-out"`，不受全局 reduced-motion class 约束。 | 根据 reduced-motion 偏好禁用 transform transition，或迁移到带 `motion-reduce:transition-none` 的 class。 |
| ⏳ `apps/web/app/components/activities/MomentDetailView.tsx:210` | `accessibility-12` | 自绘下拉菜单缺少 Esc 关闭、外部点击关闭和 menuitem 语义证据。 | 抽成通用 Dropdown/Menu，支持键盘方向键、Esc 和焦点回收。 |
| ➖ `apps/web/app/components/profile/profileTab/components/AccountSecurityModal.tsx:298` | `accessibility-12` | 账号安全弹窗遮罩 `onClick={onClose}`，片段未显示 dialog 语义、焦点陷阱或 Esc 关闭。 | 复用统一 Modal/Dialog 基础组件，补 `role="dialog" aria-modal`、焦点回收和 Esc。 |
| ✅ `apps/web/app/components/profile/profileTab/components/AccountSecurityModal.tsx:375` | `interactivity-21`, `copywriting-7` | 发送验证码按钮有 disabled，但需要明确倒计时/已发送反馈；否则用户可能重复尝试。 | disabled 时显示剩余秒数或“已发送，请查看邮箱”；读屏用 `aria-live` 汇报发送结果。 |
| ✅ `apps/web/app/components/auth/RegisterForm.tsx:307` | `interactivity-21`, `copywriting-7` | 发送验证码按钮有 disabled 条件，但需要明确发送中、倒计时和目标邮箱。 | disabled 时显示倒计时/发送中；用 `aria-live` 宣告“验证码已发送到 {email}”。 |
| `apps/web/app/components/chat/chatPageModals.tsx:149` | `design-6`, `design-7` | 创建分类弹窗主内容区和文档信息区都使用 `hidden-scrollbar`，这是长表单/长内容区域，滚动 affordance 被隐藏。 | 长表单区域改用低对比细滚动条；只在短横向工具条保留隐藏滚动条。 |
| `apps/web/app/components/common/scrollbar.css:1` | `design-6`, `design-7` | `.hidden-scrollbar` 是全局 utility，任何调用都会完全隐藏主轴滚动条，容易被误用到长列表和弹窗。 | 拆成 `hidden-scrollbar-short` 与 `subtle-scrollbar` 两类，长列表默认使用可见细滚动条。 |

### WebGAL / 导入 / AI 图片工作台

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ✅ `apps/web/app/components/chat/window/spaceWebgalGameConfigSection.tsx` | `accessibility-11`, `copywriting-9` | 配置区有多个 placeholder 输入，WebGAL 参数含义通常专业，placeholder 不足以承载说明。 | 给每个配置项加可见 label 与简短帮助文本，错误时说明影响范围。 |
| ✅ `apps/web/app/components/chat/window/importChatMessagesWindow.tsx:567` | `copywriting-7` | 导入 textarea placeholder 包含超长 RGL 示例，作为输入提示信息过重，会挤占错误/帮助信息。 | 将示例移到可展开“查看格式示例”，placeholder 简化为“粘贴聊天记录或 RGL 内容”。 |
| ✅ `apps/web/app/components/aiImage/sidebar/ProEditorContent.tsx:230` | `accessibility-12`, `motion-15/accessibility-2` | Prompt 设置齿轮按钮有菜单语义，但面板用 fixed + transition，未见外部点击/Esc/focus 管理和 reduced-motion。 | 使用统一 popover/menu hook：Esc 关闭、焦点回收、外部点击关闭，transition 加 `motion-reduce`。 |
| ✅ `apps/web/app/components/aiImage/sidebar/ProEditorContent.tsx:533` | `accessibility-12` | “Open Base Image Inpaint” 类图标+文案按钮 disabled 时未见 `aria-disabled`/解释。 | disabled 时提供 `title` 或相邻说明，解释 busy/缺图/模型限制。 |
| ✅ `apps/web/app/components/aiImage/preview/DirectorWorkspace.tsx` | `accessibility-12` | Director 工作台命中多处 drag、左右图复制/下载、工具切换按钮；部分按钮有 aria-label，但工具区需要状态语义。 | 工具按钮补 `aria-pressed` 表示当前工具；拖拽导入补显式上传按钮与键盘路径。 |
| ✅ `apps/web/app/components/aiImage/preview/DirectorWorkspace.tsx:338` | `motion-15/accessibility-2` | 处理中的绝对覆盖层有 backdrop blur，若叠加动画/忙碌状态，读屏需要知道当前不可操作。 | 给工作区容器补 `aria-busy`；处理时把 overlay 文案放入 `aria-live`。 |

### Web 聊天长尾 / 空间配置

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| ✅ `apps/web/app/components/aiImage/preview/StandardPreviewWorkspace.tsx:75` | `copywriting-7`, `accessibility-12` | Upscale disabled 按钮的 label 是英文 `Upscale disabled`，但没有说明为何不可用。 | 统一中文 label，并用 `title`/说明文本解释当前禁用原因。 |
| `apps/web/app/components/aiImage/preview/StandardPreviewWorkspace.tsx:125` | `motion-15/accessibility-2` | 忙碌状态顶部 `animate-pulse` 信息条未见 reduced-motion 降级。 | 在 reduced-motion 下禁用 pulse，改用静态进度条和 `aria-busy`。 |
| ✅ `apps/web/app/components/chat/window/addRoleWindow.tsx:274` | `copywriting-9` | “创建角色 / 创建 NPC”入口卡片只有动作名，未说明会创建到当前房间、空间库还是个人角色。 | 文案补足目标范围，例如“创建并加入当前房间”。 |
| ⏳ `apps/web/app/components/chat/room/roomSidebarMaterialPackageItem.tsx:123` | `accessibility-12` | 素材节点按钮同时支持点击、键盘与 `draggable`，但拖拽没有键盘等价路径。 | 为素材节点增加菜单操作：发送、移动到、复制路径、移入子窗口；保留 drag 作为增强。 |
| ⏳ `apps/web/app/components/chat/clues/clueFolderSidebar.tsx:425` | `accessibility-12` | 线索卡片是 button 但也承担拖拽/重排，键盘用户缺少等价的移动排序路径。 | 增加“上移/下移/移动到文件夹”菜单或快捷按钮。 |
| ✅ `apps/web/app/components/chat/clues/clueFolderSidebar.tsx:1244` | `accessibility-12` | modal backdrop 用 button 文本“关闭”，基础可访问，但与上方自定义 modal 的焦点管理不明确。 | 统一到 Dialog 组件，确保 Esc、焦点陷阱和关闭后焦点回收。 |
| ✅ `apps/web/app/components/chat/shared/map/DNDMap.tsx:1038` | `accessibility-12`, `interactivity-3` | 地图 overlay 是 `div onClick`，没有 role/tabIndex；核心落位操作是指针点击。 | 改成 button/可聚焦区域，或提供行列输入/方向键移动的非精细指针替代。 |
| ➖ `apps/web/app/components/chat/shared/map/DNDMap.tsx:1199` | `interactivity-20`, `accessibility-12` | 清空地图按钮是高影响操作，片段未显示确认或 `aria-label`。 | 清空前确认并说明会移除地图/落位；补明确 label。 |
| `apps/web/app/components/chat/window/createSpaceWindow.tsx:262` | `motion-15/accessibility-2` | 空间头像 hover 使用 `group-hover:scale-105` 与 brightness 变化，未见 reduced-motion。 | 加 `motion-reduce:scale-100 motion-reduce:transition-none`。 |
| `apps/web/app/components/chat/window/createSpaceWindow.tsx:357` | `design-6`, `design-7` | 创建空间主内容区使用 `hidden-scrollbar`，这是长表单区域，滚动条完全隐藏。 | 改为低对比细滚动条，避免用户不知道还有初始对话/规则/骰娘配置。 |
| `apps/web/app/components/repository/home/RepositoryHome.tsx:608` | `motion-15/accessibility-2` | 加载骨架使用 `animate-pulse`，未见 reduced-motion 降级，也没有 `aria-busy` 包裹列表。 | reduced-motion 下禁用 pulse；列表容器加 `aria-busy={repositoryList.isLoading}`。 |
| ⏳ `apps/web/app/components/chat/room/sidebarTreeOverlays.tsx:188` | `accessibility-12` | 右键菜单覆盖层是 `fixed inset-0` + 绝对按钮关闭，菜单项缺 menu/menuitem 语义和键盘方向键支持证据。 | 收敛为通用 ContextMenu：`role="menu"`、`menuitem`、Esc/方向键、关闭后焦点回收。 |
| ✅ `apps/web/app/components/chat/room/sidebarTreeOverlays.tsx:240` | `interactivity-20`, `copywriting-7` | 删除分类/文档菜单项在上下文菜单中直接触发请求，片段未看到统一确认文案或禁用原因。 | 删除前确认并写明影响范围；不可编辑时用 disabled + title 说明权限原因，而不是仅在 click handler 中 return。 |
| `apps/web/app/components/chat/window/addMemberWindow.tsx:209` | `design-6`, `design-7` | 成员选择主内容、好友列表、搜索结果和左右栏多处使用 `hidden-scrollbar`，属于长列表/长内容区域。 | 长列表改用细滚动条或 fade edge；`hidden-scrollbar` 仅保留给短横向工具条。 |
| ✅ `apps/web/app/components/common/acticityAndFeedPostsCard/postsCard.tsx:254` | `accessibility-12` | “更多操作”按钮只有 `⋯`，缺少 `aria-label`、`aria-expanded`、`aria-controls`；菜单项也未见 menu/menuitem 语义。 | 抽成统一 action menu，按钮补“更多动态操作”label 与展开状态，菜单支持 Esc/方向键。 |
| ⏳ `apps/web/app/components/common/acticityAndFeedPostsCard/postsCard.tsx:274` | `interactivity-20`, `copywriting-7` | 删除动态是高影响操作，菜单里直接触发 `handleDelete`，片段未看到确认、撤销或影响说明。 | 删除前确认并说明会移除动态/评论；若已删除可提供短时撤销。 |
| ✅ `apps/web/app/components/common/acticityAndFeedPostsCard/postsCard.tsx:320` | `typography-2/accessibility-8` | 动态正文 `line-clamp-4`，点击整块进入详情，但按钮没有 `aria-label` 说明可查看全文。 | 内容按钮 label 写成“查看动态全文/详情”，并让截断文本有详情 affordance。 |
| ✅ `apps/web/app/components/common/acticityAndFeedPostsCard/postsCard.tsx:366` | `accessibility-12` | 评论入口是 `div onClick`，没有 button 语义、键盘入口或可见 focus 状态。 | 改为 `<button type="button">`，补 `aria-label={\`查看 ${commentCount} 条评论\`}` 和 focus-visible。 |
| ✅ `apps/web/app/components/repository/detail/repositoryDetail.tsx:497` | `typography-2/accessibility-8` | 关联空间名、查看模式提示和房间名多处 `truncate`，片段未看到完整名称 title/tooltip。 | 给这些状态文本补 `title` 或 `aria-label`，避免长空间/房间名在预览模式下不可辨认。 |
| ✅ `apps/web/app/components/repository/detail/repositoryDetail.tsx:536` | `accessibility-12` | 查看模式预览层是 `absolute inset-0` 覆盖内容，但不是 dialog/region，也未见焦点进入/退出管理。 | 若作为覆盖视图，补 `role="region"`、标题和关闭后焦点回收；若语义等同弹窗，改用 Dialog。 |
| ✅ `apps/web/app/components/topbanner/Topbanner.tsx:421` | `typography-2/accessibility-8` | 用户名和 ID 在下拉菜单中 `truncate`，没有完整文本 affordance；复制邀请码只覆盖邀请链接，不覆盖用户 ID。 | 给用户名/ID 补 `title`/复制入口，`aria-label` 包含完整用户名和用户 ID。 |
| ✅ `apps/web/app/components/topbanner/Topbanner.tsx:525` | `interactivity-20`, `copywriting-7` | 退出登录按钮在用户菜单底部直接触发，片段未看到确认或说明会结束当前会话。 | 对退出登录提供确认或撤销式 toast；至少按钮 hint 写明会退出当前账号。 |
| ✅ `apps/web/app/components/common/comment/commentComponent.tsx:297` | `accessibility-12` | 回复树竖线是 `div onClick`，用于收起回复但没有 button 语义、键盘入口或可见焦点。 | 改成透明按钮或给现有折叠按钮承载该操作；补 `aria-label="收起回复线程"`。 |
| ✅ `apps/web/app/components/common/comment/commentComponent.tsx:325` | `accessibility-12` | 折叠后的评论头部 `div onClick` 可展开，但缺少 role/tabIndex；键盘用户只能依赖右侧小按钮。 | 让整块成为 button，或只保留显式展开按钮并移除整块点击。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorAtomicBlock.tsx:454` | `accessibility-12`, `interactivity-7` | 媒体浮动操作默认 `opacity-0` 且依赖 hover/focus-within 显示；键盘用户可能在看不见按钮时先 tab 到隐藏操作。 | 让操作区在 block focus 时持续可见，或提供始终可见的更多菜单入口。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorAtomicBlock.tsx:475` | `interactivity-20`, `accessibility-12` | 删除媒体块/文件块按钮多处直接调用 `deleteBlock`，未见确认、撤销或包含块类型的 label。 | 删除前对已上传媒体确认，或提供撤销；按钮 `aria-label` 包含“删除图片/音频/文件块”。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorAtomicBlock.tsx:606` | `accessibility-12` | 文件拖放容器支持 drag/drop，但没有 `role`、`aria-label` 或键盘上传路径说明。 | 给 drop zone 补“拖放或点击上传”的 label，并确保同区块有可聚焦上传按钮。 |
| ✅ `apps/web/app/components/aiImage/AiImageWorkspace.tsx:81` | `copywriting-7`, `accessibility-12` | 固定预览操作按钮 label/title 是英文 `Unpin preview`、`Jump to pinned image`、`Apply pinned seed`。 | 统一中文 label/title，并说明“取消固定 / 跳到该图 / 应用该图 seed”。 |
| `apps/web/app/components/aiImage/AiImageWorkspace.tsx:176` | `motion-15/accessibility-2` | 历史侧栏收起/展开使用宽度、位移和透明度 transition，未见 reduced-motion 分支。 | 给历史侧栏切换补 `motion-reduce:transition-none motion-reduce:transform-none`。 |
| ✅ `apps/web/app/components/Role/rules/ExpansionModule.tsx:519` | `accessibility-12` | 移动端快捷工具 dropdown 按钮只有 label，未见 `aria-expanded` / `aria-controls`；菜单依赖 daisyUI 类。 | 用受控 dropdown 或补展开状态、菜单 id、Esc 关闭和焦点回收。 |
| ✅ `apps/web/app/components/Role/rules/ExpansionModule.tsx:733` | `accessibility-12` | ST 指令弹窗是手写 `fixed inset-0` 遮罩，缺少 `role="dialog"`、`aria-modal`、Esc/focus trap 证据。 | 复用统一 Modal/Dialog，补 dialog 语义、焦点陷阱和关闭后焦点回收。 |
| ✅ `apps/web/app/components/chat/input/inlineSearch.tsx:264` | `accessibility-12`, `typography-2/accessibility-8` | 搜索结果项用 `div onClick` 跳转消息，缺少 button 语义与完整消息上下文 label。 | 改为 button，`aria-label` 包含发送者、时间和匹配摘要。 |
| ✅ `apps/web/app/components/chat/discover/discoverArchivedSpacesView.tsx:329` | `typography-2/accessibility-8` | 归档仓库面板标题和页面标题使用 `truncate`，片段未看到完整标题 affordance。 | 给标题补 `title`/`aria-label`，避免长仓库名或页面名不可辨认。 |
| `apps/web/app/components/chat/discover/discoverArchivedSpacesView.tsx:466` | `motion-15/accessibility-2` | 归档列表 loading skeleton 使用 `animate-pulse`，未见 reduced-motion 降级。 | reduced-motion 下禁用 pulse，并在列表容器补 `aria-busy`。 |
| ✅ `apps/web/app/components/Role/sprite/Tabs/SpriteCropper.tsx:1427` | `accessibility-12`, `interactivity-3` | 移动端预览面板通过 `div onClick` 打开裁剪弹窗，缺少 button 语义和键盘入口。 | 改成按钮或补 role/tabIndex/键盘激活；label 写明“打开裁剪区域调整”。 |
| ✅ `apps/web/app/components/Role/sprite/Tabs/SpriteCropper.tsx:1500` | `accessibility-12` | 裁剪弹窗关闭按钮只有 “✕”，缺少可读标签。 | 补 `aria-label="关闭裁剪区域调整"`，保持现有紧凑视觉尺寸。 |
| ⏳ `apps/web/app/components/chat/chatFrameMessageItem.tsx:147` | `accessibility-12`, `interactivity-3` | 消息移动依赖 HTML drag，虽然有拖拽按钮，但未见键盘等价移动路径。 | 为多选移动提供“上移/下移/移动到上下文”菜单或快捷按钮。 |
| ✅ `apps/web/app/components/Role/RuleEditor/RuleEditor.tsx:663` | `typography-2/accessibility-8` | 规则名标题 `truncate`，片段未看到完整规则名 affordance。 | 标题补 `title={ruleEdit.ruleName}` 或详情 tooltip，避免相似规则名混淆。 |
| `apps/web/app/components/aiImage/sidebar/ProBottomSettingsDrawer.tsx:146` | `motion-15/accessibility-2` | AI 设置抽屉使用 `transition-all duration-300` 展开收起，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，避免高度/位移动画。 |
| ✅ `apps/web/app/components/aiImage/sidebar/ProBottomSettingsDrawer.tsx:163` | `copywriting-7` | 抽屉标题仍为英文 `AI Settings`，seed placeholder 为英文 `Enter a seed`，与中文界面不一致。 | 统一为“AI 设置”“输入 seed”，并保留必要英文术语说明。 |
| ✅ `apps/web/app/components/chat/room/contextMenu/chatPageContextMenu.tsx:167` | `interactivity-20`, `copywriting-7` | 解散房间已进入确认流程，但菜单项本身未见说明影响范围；属于高影响操作。 | 菜单项/确认框文案明确会解散房间、影响成员和内容访问。 |
| `apps/web/app/components/chat/shared/components/memberLists.tsx:310` | `motion-15/accessibility-2` | 成员操作菜单使用 `animate-fadeIn`，未见 reduced-motion 降级。 | reduced-motion 下禁用 fade 动画。 |
| ✅ `apps/web/app/components/chat/shared/webgal/webgalChooseModal.tsx:70` | `accessibility-11`, `copywriting-7` | 选项文本和自定义代码输入虽然有 `aria-label`，但主要说明依赖 placeholder；自定义代码格式/作用不明确。 | 增加辅助说明，解释自定义代码何时使用、如何影响 WebGAL 选项。 |
| ✅ `apps/web/app/components/chat/shared/webgal/webgalChooseModal.tsx:100` | `interactivity-21`, `accessibility-12` | 提交 WebGAL 选项按钮没有看到 disabled/busy 或提交失败反馈。 | 提交中禁用并补 `aria-busy`，失败时用 `role="alert"` 或 toast 告知。 |
| ✅ `apps/web/app/components/chat/shared/webgal/webgalChooseModal.tsx:103` | `accessibility-12` | 弹窗使用 modal backdrop button 关闭，片段未显示 dialog 标题关联、Esc/focus trap 或关闭后焦点回收。 | 统一到 Dialog 组件，补 `aria-labelledby`、焦点管理和 Esc 关闭。 |
| `apps/web/app/components/chat/space/chatSpaceSidebar.tsx:313` | `design-6`, `design-7` | 空间列表容器使用 `hidden-scrollbar`，这是主要纵向导航区，滚动 affordance 被隐藏。 | 改为低对比细滚动条，或增加上下 fade edge 表示可滚动。 |
| ✅ `apps/web/app/components/chat/space/chatSpaceSidebar.tsx:241` | `accessibility-12` | 私信/发现导航按钮有 pressed/current 语义，但重复点击还承担折叠左栏操作，label 未说明第二行为。 | 动态 `aria-label` 说明“进入私信/收起左栏”或拆分导航与折叠操作。 |
| `apps/web/app/components/chat/window/createRoomWindow.tsx:125` | `design-6`, `design-7` | 建房窗口主内容使用 `hidden-scrollbar`，是长表单区域，用户可能不知道下面还有初始对话设置。 | 长表单使用可见细滚动条或 fade edge，不要完全隐藏主轴滚动条。 |
| `apps/web/app/components/chat/window/createRoomWindow.tsx:152` | `motion-15/accessibility-2` | 房间头像 hover 使用 scale/brightness/blur 组合动效，未见 reduced-motion 降级。 | 加 `motion-reduce:scale-100 motion-reduce:transition-none`，保留颜色变化即可。 |
| ✅ `apps/web/app/components/Role/RoleCreation/steps/AIGenerateModal.tsx:174` | `accessibility-11`, `copywriting-7` | 生成提示词 textarea 主要依赖长 placeholder 承载示例，缺少稳定说明和规则约束提示。 | 增加可见 label/帮助文本，说明会基于当前规则生成哪些字段。 |
| ✅ `apps/web/app/components/Role/rules/RulesSection.tsx:142` | `accessibility-12`, `interactivity-21` | 上一页/下一页按钮 disabled 时只靠按钮状态表达，未说明已到首页/末页。 | 补 `aria-label` 和 disabled `title`，例如“已经是第一页”。 |
| ✅ `apps/web/app/components/Role/rules/RulesSection.tsx:339` | `accessibility-12` | 规则卡片外层是 `div onClick`，缺少 button 语义、tabIndex 和键盘激活。 | 改为 `<button>` 或补 role/button、tabIndex、Enter/Space 激活。 |
| ✅ `apps/web/app/components/chat/message/roomJump/roomJumpMessage.tsx:157` | `accessibility-12`, `typography-2/accessibility-8` | 房间跳转卡片按钮包含多个 `truncate` 文本，但 button 只用 `title` 表达是否可跳转，未见完整上下文 label。 | `aria-label` 包含目标空间、分类、房间名、标题和禁用原因。 |
| `apps/web/app/components/chat/message/roomJump/roomJumpMessage.tsx:184` | `motion-15/accessibility-2` | 跳转卡片 hover overlay 使用 opacity/transform transition，未见 reduced-motion 降级。 | reduced-motion 下禁用 hover 位移/透明度动画。 |
| ✅ `apps/web/app/components/chat/room/roomSidebarCategoryHeader.tsx:62` | `accessibility-12`, `interactivity-3` | 分类头外层 `draggable` 且整行 `onClick` 折叠，缺少稳定 button 语义和键盘重排路径。 | 将折叠交给显式按钮；分类排序提供“上移/下移/移动到”菜单。 |
| ➖ `apps/web/app/components/chat/room/roomSidebarCategoryHeader.tsx:151` | `accessibility-12`, `interactivity-7` | 新增操作按钮默认 `opacity-0`，依赖 hover/focus 才显现；键盘和触屏发现性较弱。 | 在可编辑状态下保持常显或提供稳定“更多”菜单入口。 |
| ✅ `apps/web/app/components/feedback/feedbackIssueTimeline.tsx:65` | `accessibility-12` | 评论动作按钮没有 `aria-pressed` 或状态语义；回复状态依赖外部 UI。 | 回复激活时补 `aria-pressed`，普通动作保留 button 语义。 |
| ✅ `apps/web/app/components/feedback/feedbackIssueTimeline.tsx:367` | `interactivity-21`, `accessibility-12` | “加载更多评论”按钮 fetching 时只改文案和 disabled，未见 `aria-busy` 或结果反馈。 | 补 `aria-busy={isFetchingNextPage}`，加载完成/失败用 live region 宣告。 |
| ✅ `apps/web/app/components/Role/RoleBasicInfoEditor.tsx:149` | `accessibility-11`, `interactivity-21` | 角色描述 textarea 有 `aria-label`，但 placeholder 仍是主要提示；保存按钮未见 pending/busy 或保存失败反馈。 | 增加描述编辑帮助文本；保存时补 `aria-busy` 与成功/失败反馈。 |
| ✅ `apps/mobile/src/features/roles/edit/AvatarCropModal.tsx:272` | `accessibility-12`, `interactivity-21` | 裁剪 Modal 的取消/确认 `Pressable` 未见 `accessibilityRole` / `accessibilityState`；处理中只改文字和颜色。 | 补 button role；处理中补 disabled/busy state，确认按钮说明会应用裁剪。 |
| `apps/web/app/components/chat/chatPageSubWindow.tsx:424` | `motion-15/accessibility-2` | 副窗口右边缘拖拽把手使用 `transition-all`、位移和 opacity，未见 reduced-motion 降级。 | 在 reduced-motion 下禁用位移/透明度动画，只保留静态把手。 |
| ➖ `apps/web/app/components/chat/chatPageSubWindow.tsx:433` | `accessibility-12`, `interactivity-3` | 副窗口打开主要依赖拖拽把手，按钮语义是“向左拖拽打开副窗口”，但未见键盘等价打开路径。 | 提供可点击“打开副窗口”按钮或菜单项，拖拽只作为增强。 |
| ➖ `apps/web/app/components/chat/room/sidebarSection.tsx:53` | `accessibility-12` | 侧栏 section 头部外层 `div onClick` 与内部按钮同时控制折叠，语义重复且外层不可键盘激活。 | 仅保留显式 button 控制折叠，或外层补 role/button 与键盘事件。 |
| ➖ `apps/web/app/components/chat/room/sidebarSection.tsx:87` | `interactivity-7`, `accessibility-12` | section action 默认透明，依赖 hover/focus 显示；触屏发现性较弱。 | 可编辑场景保持常显，或统一到稳定“更多”菜单入口。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorSpeakerAvatarMenu.tsx:79` | `typography-2/accessibility-8` | 说话人/头像菜单的角色标签、查询词、分类名和头像标题多处 `truncate`，只有部分头像项有 `title` / `aria-label`。 | 为菜单头部、分类标题和所有头像项补完整 `title`/`aria-label`，包含角色名、分类和头像名。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorSpeakerAvatarMenu.tsx:142` | `accessibility-12` | 头像菜单项通过 `onClick={() => onSelect(item)}` 选择头像，片段未显示 menu/menuitem 语义或当前选中状态。 | 菜单容器使用 listbox/menu 语义；选项补 `aria-selected` 或 `aria-pressed`。 |
| ✅ `apps/web/app/components/repository/commitChain/RepositoryCommitChainPage.tsx:105` | `copywriting-7`, `typography-2/accessibility-8` | “结果已截断” badge 只说明状态，没有解释为什么截断或如何查看完整提交链。 | badge 附近补简短说明或 tooltip，例如“仅显示最近 N 条，调整筛选查看完整历史”。 |
| ✅ `apps/web/app/components/repository/detail/ContentTab/scene/react flow/NewSceneNode.tsx:152` | `accessibility-12` | 场景节点使用 `absolute inset-0` 透明按钮覆盖整卡，按钮 label 只含场景名，未说明会打开/查看。 | `aria-label` 改为“查看场景 {label}”，同时确保覆盖按钮不遮挡内部可聚焦操作。 |
| ✅ `apps/mobile/src/features/chat/ChatSearchPage.tsx:120` | `accessibility-12` | 返回按钮只有 `accessibilityLabel="返回"`，未说明返回聊天还是关闭搜索页。 | 改为更具体的“返回聊天”或“关闭聊天搜索”。 |
| ✅ `apps/mobile/src/features/chat/ChatSearchPage.tsx:127` | `accessibility-11` | 搜索输入片段只看到 placeholder，未见 `accessibilityLabel`。 | 补 `accessibilityLabel="搜索聊天记录"`，placeholder 保留示例。 |
| ➖ `apps/web/app/components/chat/room/roomSidebarDocItem.tsx:100` | `accessibility-12`, `interactivity-3` | 文档条目外层同时承担点击、键盘激活、右键菜单和拖拽，虽然有 Enter/Space，但整体不是原生 button，语义复杂。 | 拆分为可聚焦文档按钮 + 拖拽把手；保留键盘激活，并为拖拽提供移动菜单。 |
| ⏳ `apps/web/app/components/chat/room/roomSidebarDocItem.tsx:129` | `accessibility-12`, `interactivity-3` | 文档排序依赖 `draggable`，未见键盘等价重排或移动到分类路径。 | 增加“移动到分类 / 上移 / 下移”菜单，拖拽只作为增强。 |
| `apps/web/app/components/chat/room/roomWindowLayout.tsx:123` | `motion-15/accessibility-2` | 房间背景、遮罩和内容层使用多段 `transition-all/transition-opacity duration-500`，只有部分 motion transition 显式检查 reduced-motion。 | 背景/遮罩 CSS transition 也补 `motion-reduce:transition-none`。 |
| ➖ `apps/web/app/components/chat/shared/components/roomButton.tsx:38` | `accessibility-12`, `interactivity-3` | 房间按钮外层 `draggable`，按钮本体只负责点击，未见键盘重排路径。 | 房间排序增加上移/下移/移动到菜单；拖拽作为增强交互。 |
| ✅ `apps/web/app/components/chat/window/spaceWebgalRenderWindowPanels.tsx:134` | `typography-2/accessibility-8` | 房间名 `truncate`，错误信息也可能被截断，虽然错误有 title，房间名没有完整 affordance。 | 房间名补 `title`；房间状态卡 `aria-label` 包含完整名称、ID 和状态。 |
| `apps/web/app/components/privateChat/components/ChatItem.tsx:191` | `interactivity-7`, `interactivity-20` | PC 删除会话按钮默认 hover/focus 才出现，且删除会话是高影响操作。 | 提供稳定更多菜单入口；删除前确认或提供撤销，说明只删除本地会话还是会影响双方记录。 |
| `apps/web/app/components/Role/sprite/Tabs/AvatarSettingsTab.tsx:207` | `motion-15/accessibility-2` | 头像设置卡片 hover overlay 使用 opacity/背景 transition，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，减少 hover 过渡。 |
| ✅ `apps/mobile/src/features/friends/DmConversationList.tsx:119` | `accessibility-12`, `typography-2/accessibility-8` | 私聊会话项有 `accessibilityLabel`，但只包含联系人和未读数，未包含截断的最后一条消息。 | label 补完整最后消息摘要，帮助区分相似联系人会话。 |
| `apps/web/app/components/aiImage/PreviewImageDialog.tsx:54` | `motion-15/accessibility-2` | 图片预览遮罩和内容使用 opacity/translate/scale transition，未见 reduced-motion 降级。 | reduced-motion 下禁用位移/缩放，只保留即时显隐。 |
| ✅ `apps/web/app/components/chat/message/chatAttachmentsPreviewFromStore.tsx:156` | `accessibility-12`, `interactivity-20` | 删除附件控件是 `div onClick`，不是 button；删除附件也未见确认/撤销。 | 改为 button，`aria-label={\`移除附件 ${file.name}\`}`，提供撤销或可重新添加提示。 |
| ✅ `apps/web/app/components/chat/message/chatAttachmentsPreviewFromStore.tsx:188` | `accessibility-12`, `interactivity-20` | 移除语音附件同样是 `div onClick`，缺少 button 语义和完整 label。 | 改成 button，label 写明“移除语音附件”。 |
| ✅ `apps/web/app/components/chat/shared/webgal/webGALPreview.tsx:178` | `interactivity-21`, `accessibility-12` | 打开 WebGAL 设置按钮 disabled 于空间不可用，但片段只用 title 表达原因，未见 `aria-disabled` 说明。 | disabled 时保留可读说明，必要时在按钮旁显示“当前空间不可用”。 |
| ✅ `apps/web/app/components/chat/window/createNpcRoleWindow.tsx:85` | `accessibility-12` | “创建NPC / 从NPC库导入”是 tab 样式按钮，但只靠 `tab-active` 表达当前页。 | 给外层补 `role="tablist"`，按钮补 `role="tab"` 和 `aria-selected`，或改用现有 tabs 组件语义。 |
| ✅ `apps/web/app/components/chat/window/createNpcRoleWindow.tsx:127` | `copywriting-9` | NPC 库为空时只显示“无可导入NPC”，没有说明下一步。 | 空状态补“先创建 NPC 或检查当前空间角色权限”等可执行下一步。 |
| ✅ `apps/web/app/components/chat/window/createNpcRoleWindow.tsx:138` | `accessibility-12`, `typography-2/accessibility-8` | NPC 导入入口只有头像 button，角色名在按钮外；读屏和键盘用户难以知道会导入哪个 NPC。 | 把头像和名称合成一个按钮，`aria-label={\`导入 NPC ${role.roleName}\`}`，并给长名称保留完整 title。 |
| ✅ `apps/web/app/components/common/uploader/imgUploaderWithCropper.tsx:353` | `accessibility-12` | 文件选择触发器是 `button className="contents"` 包住任意 children，按钮自身没有可访问名称。 | 允许调用方传入 `aria-label`，或默认补“选择图片文件”；确认 children 不是交互元素，避免嵌套按钮。 |
| ✅ `apps/web/app/components/common/uploader/imgUploaderWithCropper.tsx:379` | `copywriting-1`, `accessibility-12` | 裁剪图像的 `alt="Crop me"` 是英文占位文案。 | 改为“待裁剪图片”，并让上传弹窗标题/说明关联到裁剪区域。 |
| `apps/web/app/components/material/components/materialPackageLibraryFrame.tsx:74` | `motion-4`, `accessibility-2` | 素材库侧栏折叠按钮和侧栏都用 300ms transition，未见 reduced-motion 降级；这是高频布局切换。 | 加 `motion-reduce:transition-none`，图标可保持静态方向或只更新状态。 |
| ✅ `apps/web/app/components/Role/RoleInfoCard/AvatarUploadCropper.tsx:224` | `accessibility-12`, `interactivity-21` | 上传头像触发器是 `div onClick`，不是键盘可达控件；提交中只静默忽略点击。 | 改为 button 或给触发器补 `role="button"`、`tabIndex`、Enter/Space 和 disabled/busy state。 |
| ✅ `apps/web/app/components/Role/RoleInfoCard/AvatarUploadCropper.tsx:311` | `accessibility-11` | “立绘组名称”输入只有 placeholder，没有稳定 label。 | 给输入加可见 label 或 `aria-label="立绘组名称"`，placeholder 只作示例。 |
| ✅ `apps/web/app/components/Role/RoleInfoCard/AvatarUploadCropper.tsx:338` | `interactivity-21`, `copywriting-7` | “继续校正”提交中只把文案改成“处理中...”，未说明正在上传还是校正准备。 | 用当前阶段文案，例如“正在准备头像校正...”；按钮补 `aria-busy={isSubmittingFiles}`。 |
| ✅ `apps/web/app/components/aiImage/history/HistoryImageTile.tsx:44` | `accessibility-12`, `interactivity-3` | 历史缩略图可点击且可拖拽，但主按钮没有 `aria-label`，拖拽能力也没有键盘替代说明。 | 用 seed/尺寸/模式生成完整 label；提供“选择/打开历史图”键盘路径，拖拽另给下载或发送按钮替代。 |
| `apps/web/app/components/aiImage/history/HistoryImageTile.tsx:58` | `motion-15/accessibility-2` | 缩略图 hover 放大 `scale-[1.02]`，历史列表是高频浏览区域，未见 reduced-motion 降级。 | 加 `motion-reduce:transform-none motion-reduce:transition-none`，保留静态边框高亮。 |
| ✅ `apps/web/app/components/chat/message/docCard/docCardMessage.tsx:51` | `interactivity-3`, `accessibility-12` | 文档卡片支持拖拽复制到侧边栏或再次发送，但键盘路径只有打开预览，没有等价的拖拽替代动作。 | 给卡片菜单或工具栏补“复制文档引用 / 再次发送”按钮，并为拖拽能力提供可读 hint。 |
| `apps/web/app/components/chat/message/docCard/docCardMessage.tsx:55` | `motion-15/accessibility-2` | 文档卡 hover 阴影 transition 用于聊天消息列表，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，高频滚动列表保留静态 hover 状态即可。 |
| ✅ `apps/web/app/components/chat/message/docCard/docCardMessage.tsx:117` | `typography-2/accessibility-8` | 文档标题和摘要使用 `line-clamp`；按钮 title 只描述操作，不提供完整标题/摘要。 | 卡片 `aria-label` 组合完整标题、摘要和“打开预览”；视觉上继续保留 line-clamp。 |
| ✅ `apps/web/app/components/chat/window/workflowWindow.tsx:483` | `accessibility-12` | 工作流全屏模式使用 `fixed inset-0` 覆盖页面，但容器未见 dialog/region 标题语义。 | 全屏容器补 `role="dialog"` 或 `role="region"`、`aria-label="工作流编辑器"`，并处理背景焦点。 |
| `apps/web/app/components/Role/RuleEditor/RulePerformanceEditor.tsx:197` | `motion-15/accessibility-2` | 表演编辑卡用 `transition-opacity duration-300` 表达编辑状态，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，编辑状态主要靠 ring 和按钮文案表达。 |
| ✅ `apps/web/app/components/Role/RuleEditor/RulePerformanceEditor.tsx:295` | `typography-2/accessibility-8` | 非编辑态表演字段以卡片展示字段名和内容，长内容只 `break-all` 堆叠，缺少展开/完整读取 affordance。 | 长字段内容提供展开/收起或复制入口，卡片 `aria-label` 包含完整字段名和内容。 |
| `apps/web/app/components/chat/window/spaceWebgalRenderWindowParts.tsx:131` | `motion-4`, `motion-15/accessibility-2` | 分区展开按钮的图标旋转与 panel 展开一致，但 `transition-transform duration-200` 未见 reduced-motion 降级。 | 补 `motion-reduce:transition-none`，减少高频展开/收起动效。 |
| `apps/web/app/components/material/components/materialMessageEditorCard.tsx:243` | `interactivity-20` | 删除素材条目会直接从当前素材消息列表移除，没有确认或撤销路径。 | 删除前确认，或提供撤销 toast；保留当前紧凑悬浮工具栏尺寸。 |
| `apps/web/app/components/Role/RoleCreation/CreateDicerRole.tsx:59` | `motion-15/accessibility-2` | 保存中用 `transition-opacity duration-300` 和整体 opacity 表达状态，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，并用按钮 busy/禁用状态表达保存中。 |
| `apps/web/app/components/Role/RuleEditor/RuleNumericalEditor.tsx:184` | `motion-15/accessibility-2` | 数值编辑卡与表演编辑卡同样用 opacity transition 表达编辑状态，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，状态变化主要保留 ring 和按钮文案。 |
| ✅ `apps/web/app/components/atMentionController.tsx:347` | `typography-2/accessibility-8` | @ 角色候选的角色名和备注都 `truncate`，按钮 label 未包含完整文本。 | 候选按钮 `aria-label` 拼接完整角色名与备注，视觉继续截断。 |
| ✅ `apps/web/app/components/chat/input/commandPanel.tsx:270` | `accessibility-12` | 指令建议项是 `motion.div onClick`，不是键盘可达控件；用户只能点击选择命令。 | 改为 button 或给选项补 `role="option"`、`tabIndex`、Enter/Space 选择和当前高亮状态。 |
| ✅ `apps/web/app/components/chat/message/media/AudioMessage.tsx:899` | `accessibility-12` | 音频播放按钮的 label 只有“播放/暂停”，没有音频标题或消息上下文。 | `aria-label` 补完整音频标题，例如“播放语音 {title}”。 |
| `apps/web/app/components/chat/message/media/AudioMessage.tsx:903` | `motion-15/accessibility-2` | 音频播放/删除按钮使用 transition hover，在聊天消息中是高频控件，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，保留静态 hover 颜色。 |
| ✅ `apps/web/app/components/chat/window/addNpcRoleWindow.tsx:61` | `accessibility-12`, `typography-2/accessibility-8` | 添加 NPC 卡片只有头像 button，角色名在按钮外；读屏不知道会添加哪个 NPC。 | 让整张卡片成为 button，`aria-label={\`添加 NPC ${role.roleName}\`}`，长名称保留完整 title。 |
| `apps/web/app/components/chat/window/addNpcRoleWindow.tsx:58` | `motion-15/accessibility-2` | NPC 卡片 hover 阴影 transition 未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，列表卡片保留静态 hover 阴影或边框即可。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorSpeakerMenu.tsx:43` | `accessibility-12` | 发言人候选菜单是浮层列表，但外层未见 `role="listbox"` 或当前高亮项关联。 | 外层补 `role="listbox"` 和 `aria-activedescendant`，候选项补 `role="option"`。 |
| `apps/web/app/components/messageEditor/components/MessageEditorSpeakerMenu.tsx:70` | `motion-15/accessibility-2` | 候选项使用 motion 进入动画和 hover transition，作为编辑器高频菜单未见 reduced-motion 降级证据。 | reduced-motion 下禁用列表项位移/渐入，只保留即时显示和静态高亮。 |
| ✅ `apps/web/app/components/messageEditor/components/MessageEditorSpeakerMenu.tsx:86` | `typography-2/accessibility-8` | 候选角色名和描述都 `truncate`，按钮未见完整 `aria-label`。 | 按钮 label 拼接完整角色名、描述和“当前”状态。 |
| `apps/web/app/components/chat/discover/chatDiscoverNavPanel.tsx:11` | `motion-15/accessibility-2` | 发现导航高频切换项使用 `transition-colors`，未见 reduced-motion 降级。 | 给导航基类补 `motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/common/toastWindow/toastWindowFrame.tsx:46` | `accessibility-12` | 通用 ToastWindow 使用 modal 样式但外层未见 dialog/aria-modal/标题关联；不同调用方可能只得到视觉弹窗。 | 在通用框架层支持传入 `ariaLabel/ariaLabelledBy`，并默认补 dialog 语义。 |
| `apps/web/app/components/common/toastWindow/toastWindowFrame.tsx:67` | `motion-15/accessibility-2` | 通用弹窗固定 opacity/scale 动画，未见 `prefers-reduced-motion` 降级。 | 接入 reduced-motion，降级为仅 opacity 或即时显隐。 |
| `apps/web/app/components/common/toastWindow/toastWindowFrame.tsx:84` | `design-6`, `design-7` | `hiddenScrollbar` 会完全隐藏弹窗内容滚动条，长内容弹窗可能失去滚动 affordance。 | 仅短横向内容隐藏滚动条；长内容弹窗使用低对比细滚动条。 |
| `apps/web/app/components/material/components/materialPackageEditor.tsx:312` | `motion-15/accessibility-2` | 保存/额外动作按钮 hover 会位移 `-translate-y-0.5`，未见 reduced-motion 降级。 | 加 `motion-reduce:transform-none motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/common/roleDetail.tsx:195` | `interactivity-20`, `accessibility-12` | 踢出角色按钮和确认弹窗文案未包含具体角色名，只说“该角色”。 | 按钮与确认文案包含完整角色名和房间影响范围。 |
| ✅ `apps/web/app/components/common/acticityAndFeedPostsCard/postsCardComponents/RepositoryContentCard.tsx:27` | `accessibility-12`, `typography-2/accessibility-8` | 仓库卡片整卡是 button，标题 `line-clamp-2`、描述 `line-clamp-3`，但按钮未见完整 `aria-label`。 | 按钮 label 拼接完整仓库名和描述，视觉上继续保留 clamp。 |
| `apps/web/app/components/common/acticityAndFeedPostsCard/postsCardComponents/RepositoryContentCard.tsx:31` | `motion-15/accessibility-2` | 仓库卡片使用 `transition-all` 和 hover shadow，未见 reduced-motion 降级。 | 改为具体 transition 属性，并加 `motion-reduce:transition-none`。 |
| ⏳ `apps/web/app/routes/_dashboard/ai-image.tsx:245` | `interactivity-3`, `accessibility-12` | 侧边栏宽度调整只有 pointer drag，虽然有 label/title，但未见键盘调整路径。 | 给分隔条补左右方向键调整宽度，或提供可输入宽度/重置按钮。 |
| ✅ `apps/mobile/src/features/chat/ChatHeader.tsx:78` | `typography-2/accessibility-8` | 房间名 `numberOfLines={1}`，长房间名被截断且标题区未见完整 label。 | 标题区补完整房间名 `accessibilityLabel`，必要时长按复制房间名。 |
| ➖ `apps/web/app/components/common/markdown/textMediaEditor.tsx:155` | `accessibility-12` | “上传图片”按钮包在 `ImgUploader` 内；若上传器外层也渲染 button，会形成嵌套交互控件。 | 调整上传器支持 `asChild` 或让触发器只保留一个 button。 |
| ✅ `apps/web/app/components/chat/window/workflowConditionEditor.tsx:24` | `accessibility-11` | 条件输入有 `aria-label="条件"`，但 placeholder 才说明“修改后的条件”，语义偏泛。 | label 改为“修改后的工作流条件”，并用说明文本解释条件格式。 |
| ✅ `apps/web/app/components/chat/window/spaceTrpgSettingWindow.tsx:263` | `interactivity-21`, `accessibility-12` | 无编辑权限时规则选择按钮仍可聚焦/点击后拦截，只用 `aria-disabled` 和 opacity 表达。 | 使用原生 disabled 或补禁用原因说明，避免可点但无响应。 |
| ✅ `apps/web/app/components/chat/window/spaceTrpgSettingWindow.tsx:310` | `accessibility-12` | 骰娘关联卡片是 `div onClick`，仅 `aria-disabled`，不是键盘可达控件。 | 改为 button，或补 `role="button"`、`tabIndex`、Enter/Space 和 disabled state。 |
| `apps/web/app/components/chat/window/spaceTrpgSettingWindow.tsx:310` | `motion-15/accessibility-2` | 骰娘关联卡片使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改为具体 transition 并加 `motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/chat/space/drawers/spaceDetailPanel.tsx:172` | `copywriting-1`, `accessibility-12` | 添加角色按钮文案为“角色+”，偏缩写且未见更完整 label。 | 改为“添加角色”，或补 `aria-label="添加空间角色"`。 |
| ✅ `apps/web/app/components/profile/cards/userRoleCard.tsx:21` | `accessibility-12`, `typography-2/accessibility-8` | 用户角色卡整卡是 button，角色名 `truncate`、描述 `line-clamp-2`，但按钮未见完整 `aria-label`。 | 按钮 label 拼接完整角色名、描述和“查看角色详情”。 |
| `apps/web/app/components/profile/cards/userRoleCard.tsx:26` | `motion-15/accessibility-2` | 用户角色卡 hover 上移和阴影使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改为具体 transform/shadow transition，并加 `motion-reduce:transform-none motion-reduce:transition-none`。 |
| `apps/web/app/components/profile/workTabPart/repositoryList.tsx:84` | `motion-15/accessibility-2` | 仓库列表骨架屏使用 `animate-pulse`，未见 reduced-motion 降级。 | reduced-motion 下禁用 pulse，改为静态骨架。 |
| ✅ `apps/web/app/components/Role/CharacterDetailLeftPanel.tsx:106` | `typography-2/accessibility-8` | 角色详情左栏角色名 `truncate`、描述 `line-clamp-6`，长内容缺少展开/完整读取 affordance。 | 名称/描述补 title；描述提供展开/收起或复制完整描述。 |
| ✅ `apps/web/app/components/Role/Preview/displayChatBubble.tsx:249` | `typography-2/accessibility-8` | 聊天气泡预览中的角色名多处 `truncate`，长角色名无法完整读取。 | 预览容器或角色名节点补 `title={displayRoleName}` / `aria-label`。 |
| `apps/web/app/components/Role/Preview/displayChatBubble.tsx:250` | `motion-15/accessibility-2` | 气泡预览角色名和内容使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改为具体属性 transition，并补 `motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/Role/RoleInfoCard/CharacterAvatar.tsx:64` | `accessibility-12` | 可编辑头像区域是 `div onClick`，不是键盘可达控件。 | 改为 button 或补 `role="button"`、`tabIndex`、Enter/Space 与 `aria-label="更换角色头像"`。 |
| ✅ `apps/web/app/components/Role/RoleInfoCard/CharacterAvatar.tsx:87` | `copywriting-1`, `accessibility-12` | 头像图片 alt 固定为英文 “Character Avatar”，未使用角色名。 | alt 改为“{角色名}头像”，无角色名时用“角色头像”。 |
| `apps/web/app/components/Role/RoleInfoCard/CharacterAvatar.tsx:89` | `motion-15/accessibility-2` | 可编辑头像 hover 放大和 overlay `transition-all` 未见 reduced-motion 降级。 | 加 `motion-reduce:transform-none motion-reduce:transition-none`，overlay 只做静态显隐。 |
| ✅ `apps/web/app/components/Role/RoleSidebarActionCard.tsx:32` | `accessibility-12`, `typography-2/accessibility-8` | 侧栏动作卡片是 button，副标题 `truncate`，按钮未见完整 label。 | 按钮 label 拼接标题、副标题和动作，例如“切换当前规则：{ruleName}”。 |
| `apps/web/app/components/Role/RoleSidebarActionCard.tsx:28` | `motion-15/accessibility-2` | 动作卡片和内部按钮使用 transition，未见 reduced-motion 降级。 | 给卡片和按钮补 `motion-reduce:transition-none`。 |
| ✅ `apps/mobile/src/features/chat/MobileStShowCardSheet.tsx:217` | `accessibility-12` | 属性卡分区圆点已有 role/label，但当前分区只靠颜色表达。 | 给圆点补 `accessibilityState={{ selected: active }}`。 |
| ✅ `apps/mobile/src/features/notifications/NotificationPreferencesCard.tsx:108` | `accessibility-12`, `copywriting-7` | “打开系统设置 / 刷新权限状态” Pressable 未见 role/label/hint。 | 补 button role、label 和 hint，例如“打开系统通知设置”。 |
| `apps/web/app/components/chat/state/stateMessageCard.tsx:13` | `motion-15/accessibility-2` | 状态消息卡和展开按钮使用 transition，未见 reduced-motion 降级。 | 加 `motion-reduce:transition-none`，高频消息列表里保留静态颜色变化。 |
| ✅ `apps/web/app/components/chat/space/contextMenu/spaceContextMenu.tsx:139` | `accessibility-12`, `interactivity-20` | 解散/退出空间菜单项是 `li onClick`，不是键盘可达控件；高影响操作虽有确认但菜单项本身缺少语义。 | 改为 button，补 `role="menuitem"` 和完整空间名 label。 |
| ✅ `apps/web/app/components/chat/space/contextMenu/spaceContextMenu.tsx:171` | `copywriting-1`, `interactivity-20` | 解散确认文案写“该空间”，未包含空间名/ID；不可逆操作缺少对象确认。 | 确认弹窗重复完整空间名和 ID，必要时要求二次确认。 |
| ✅ `apps/web/app/components/chat/message/diff/MessageTextDiffPreview.tsx:89` | `interactivity-20`, `copywriting-7` | “拒绝 / 接受”消息文本差异是高影响编辑决策，但按钮文案没有说明会覆盖消息内容。 | 按钮或说明区写明“接受后会替换当前消息文本”。 |
| ✅ `apps/web/app/components/material/components/materialPackageLibrarySidebar.tsx:95` | `accessibility-12`, `typography-2/accessibility-8` | 素材库侧栏项 label `truncate`，按钮未见完整 label 或当前状态。 | 按钮补完整 `aria-label`，当前项补 `aria-current` 或 `aria-pressed`。 |
| ✅ `apps/web/app/components/repository/create/components/RepositoryForm.tsx:10` | `copywriting-7`, `accessibility-11` | 仓库创建表单三个字段都有 label 与 `aria-label`，但 placeholder 为空，用户缺少作者/仓库名/描述格式示例。 | 给作者、仓库名、描述补短示例或帮助文案，例如命名规则、展示用途与长度提示。 |
| ✅ `apps/web/app/components/common/roleDetailPagePopup.tsx:168` | `interactivity-20`, `copywriting-1` | 角色缺失态仍可“踢出角色”，但按钮文案和确认描述未包含角色 ID，容易误操作。 | 按钮或确认文案包含 `roleId` 和当前房间名/ID，明确操作对象。 |
| ➖ `apps/web/app/components/chat/room/roomSidebarItemMenuButton.tsx:24` | `accessibility-12` | 房间侧栏菜单按钮默认 `pointer-events-none hidden opacity-0`，只在 hover/focus-within 显示；触屏或无 hover 场景可能缺少可发现入口。 | 在移动/触屏布局提供常驻菜单入口，或把整行 focus 后菜单按钮保持键盘可达。 |
| ✅ `apps/web/app/components/chat/room/roomWindow.tsx:1295` | `accessibility-12` | “正在处理消息操作”遮罩有 dialog 语义，但未见 `aria-busy`/live 状态；用户可能不知道操作仍在进行。 | 给弹层或内容补 `aria-busy="true"` 与 `role="status"`/`aria-live="polite"`。 |
| ✅ `apps/web/app/components/aiImage/inpaint/InpaintCanvasStage.tsx:100` | `accessibility-11` | inpaint 源图 alt 写成技术名 `inpaint-source`，不是可读描述。 | 改为“待修补图片”或包含文件/画布上下文的本地化 alt。 |
| ✅ `apps/web/app/components/chat/window/spaceSettingWindow.tsx:265` | `copywriting-1`, `accessibility-12` | 克隆来源区“前往”按钮没有说明目标空间名称或 ID，读屏和视觉文案都偏泛。 | 改为“前往来源空间”并补 `aria-label="前往来源空间 {name/ID}"`。 |
| `apps/web/app/components/chat/window/spaceSettingWindow.tsx:307` | `motion-15/accessibility-2` | 空间头像预览使用 `transition`、`group-hover:scale-105` 和亮度变化，未见 reduced-motion 降级。 | 给图片和遮罩补 `motion-reduce:transition-none motion-reduce:group-hover:scale-100`。 |
| ✅ `apps/web/app/components/common/userAvatar.tsx:232` | `accessibility-11` | 头像图片 alt 固定为英文 “Avatar”，没有使用用户名。 | 改为 `alt={\`${resolvedUsername} 的头像\`}`。 |
| `apps/web/app/components/common/userAvatar.tsx:260` | `motion-15/accessibility-2` | 用户资料卡弹层使用 `animate-in fade-in zoom-in duration-150`，未见 reduced-motion 降级。 | 补 `motion-reduce:animate-none motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/aiImage/AiImageHistoryPane.tsx:137` | `copywriting-1`, `interactivity-20` | “下载全部图片？”确认弹窗未说明将下载多少张或当前筛选范围。 | 标题或描述中包含历史图片数量，避免用户误以为只下载当前预览。 |
| ✅ `apps/web/app/components/aiImage/AiImageHistoryPane.tsx:163` | `copywriting-1`, `interactivity-20` | “删除这张图片？”未包含缩略图编号/生成时间等对象线索。 | 确认弹窗展示缩略图或历史项标题，明确删除对象。 |
| ✅ `apps/web/app/components/Role/RoleCreation/steps/BasicInfoStep.tsx:80` | `accessibility-12` | 角色简介超长时设置 `aria-invalid`，但错误说明没有 `role="alert"` 或 `aria-describedby` 关联。 | 给错误文本设置 id，并在 textarea 上补 `aria-describedby`；错误出现时用 alert/status 宣告。 |
| `apps/web/app/components/repository/create/components/RepositoryCoverImage.tsx:56` | `motion-15/accessibility-2` | 封面上传区域和 hover 遮罩使用 transition，未见 reduced-motion 降级。 | 补 `motion-reduce:transition-none`。 |
| `apps/web/app/components/repository/create/RepositoryCreateMain.tsx:58` | `motion-15/accessibility-2` | 创建仓库提交按钮使用 `transition-all duration-200`，未见 reduced-motion 降级。 | 改成必要属性 transition 或补 `motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/activities/cards/activityNoticeCard.tsx:14` | `copywriting-7`, `motion-15/accessibility-2` | 动态活动卡按钮文案混入开发命令文本，像内部调试入口而不是用户动作；按钮 hover transition 未见 reduced-motion 降级。 | 改为面向用户的“立即参与”，并补 `motion-reduce:transition-none`。 |
| ✅ `apps/web/app/components/aiImage/HighlightEmphasisTextarea.tsx:331` | `accessibility-8` | 高亮 overlay 设置 `aria-hidden` 是合理的，但启用高亮时 textarea placeholder 被置空，空状态提示可能只存在于视觉层。 | 确保 textarea 保留 `aria-label`/`aria-describedby` 说明输入用途和空态提示。 |
| ✅ `apps/web/app/components/profile/profileTab/activitiesTab.tsx:225` | `interactivity-21`, `accessibility-12` | “重新加载”按钮直接 `window.location.reload()`，没有加载中状态或失败恢复说明。 | 改为局部 refetch 优先；若整页刷新，按钮文案说明会刷新页面。 |
| `apps/web/app/components/profile/workTabPart/rolesList.tsx:46` | `motion-15/accessibility-2` | 角色作品骨架屏使用 `animate-pulse`，未见 reduced-motion 降级。 | 给 skeleton 补 `motion-reduce:animate-none`。 |
| `apps/web/app/components/common/message/message.tsx:67` | `motion-15/accessibility-2` | 全局消息 toast 使用 `fade-in-out transition-all duration-300`，未见 reduced-motion 降级。 | 对消息节点增加 reduced-motion class 或按媒体查询关闭 fade 动画。 |
| `apps/web/app/components/privateChat/components/MessageBubble.tsx:145` | `motion-15/accessibility-2` | 私聊消息时间浮层使用 opacity/transform transition，未见 reduced-motion 降级。 | 补 `motion-reduce:transition-none motion-reduce:translate-y-0`。 |
| ✅ `apps/web/app/components/material/pages/materialLibraryPage.tsx:299` | `copywriting-7` | 素材库 `upperLabel` 使用英文 “Personal Library / Public Square”，与页面中文标题混排。 | 统一为“个人素材库 / 公共素材广场”，或确认这是品牌化英文标签。 |
| ✅ `apps/web/app/components/material/pages/materialLibraryPage.tsx:381` | `copywriting-1` | 公开素材包详情标题未包含素材包名称，多个素材包切换时顶部对象识别依赖下方编辑器内容。 | 标题改为“公开素材包：{name}”或在副标题首位显示包名。 |
| ✅ `apps/web/app/components/material/pages/spaceMaterialLibraryPage.tsx:436` | `copywriting-7` | 局内素材包 `upperLabel="Space Library"` 与中文标题混排。 | 改为“空间素材库”或统一素材模块的中英文层级规则。 |
| ✅ `apps/web/app/components/material/pages/spaceMaterialLibraryPage.tsx:512` | `copywriting-1` | 编辑局内素材包标题未包含包名，副标题只说明来源/副本关系。 | 标题或副标题补当前素材包名称，方便弹窗/子窗口识别对象。 |
| ✅ `apps/web/app/components/chat/space/drawers/spaceMaterialSubWindow.tsx:125` | `copywriting-1` | 子窗口编辑局内素材包标题固定，未包含当前包名。 | 改为“编辑局内素材包：{name}”，子窗口标题更可追踪。 |
| `apps/web/app/components/common/resizableImg.tsx:324` | `motion-15/accessibility-2` | 可缩放图片 transform 使用内联 `transition: transform 0.2s ease-out`，无法通过 Tailwind reduced-motion 自动降级。 | 读取 reduced-motion 偏好后关闭内联 transition。 |
| `apps/web/app/components/Role/roleRouteStyles.css:13` | `motion-15/accessibility-2` | 角色路由 `animate-scale-in` 和 avatar connector keyframes 未见 `prefers-reduced-motion` 降级。 | 在 CSS 中为 reduced-motion 禁用 scale/line draw 动画。 |

### 移动端

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| `apps/mobile/src/features/chat/ChatNewMessagesPill.tsx:35` | `motion-15/accessibility-2` | `withTiming` 固定执行 opacity/scale 动画，未读取 reduced-motion 偏好。 | 使用 Reanimated reduced-motion 支持或系统偏好分支；reduce 时保留显隐但取消 scale。 |
| ✅ `apps/mobile/src/features/chat/ChatMessageList.tsx` | `accessibility-12`, `copywriting-9` | 错误重试 / 空状态区域仍需按同一标准复核：Pressable 语义、hitSlop、空态是否给出下一步。 | 对错误重试补 role/label/hitSlop；空状态从“暂无消息”升级为可行动文案，例如“发第一条消息开始对话”。 |
| ✅ `apps/mobile/src/app/(tabs)/explore.tsx:291` | `typography-2/accessibility-8` | 个人简介展示 `numberOfLines={1}`，没有可查看全文的 affordance；长简介只能被截断。 | 增加展开/详情入口，或在编辑入口文案中提示可查看完整简介。 |
| ✅ `apps/mobile/src/app/role-trash.tsx:179` | `typography-2/accessibility-8` | 回收站角色名 `numberOfLines={1}`，没有完整名称查看路径；硬删除前才出现完整名。 | 长按/详情菜单或 `accessibilityLabel` 包含完整角色名，避免误删相似长名称。 |
| ✅ `apps/mobile/src/features/drawer/LeftDrawer.tsx:560` | `typography-2/accessibility-8` | 空间/房间名多处 `numberOfLines={1}`，长名称截断后没有完整文本读取路径。 | `accessibilityLabel` 使用完整名称；必要时给长按菜单增加“复制名称”。 |
| ✅ `apps/mobile/src/features/roles/RoleSwitchSheet.tsx:490` | `typography-2/accessibility-8` | 头像变体标题 `numberOfLines={1}`，在角色切换场景可能截断相似变体名。 | `accessibilityLabel` 包含完整变体名与当前选中状态；长按或详情展示完整名。 |
| ✅ `apps/mobile/src/app/(auth)/web-login.tsx:142` | `copywriting-7` | WebView 加载态只显示“正在加载网页登录…”，失败时才解释状态；用户不知道这是 Turnstile/网页登录桥接页。 | 加载态补一句“用于完成安全验证，成功后会自动返回 App”。 |
| `apps/mobile/src/features/notifications/ForegroundNotificationBanner.tsx:53` | `motion-15/accessibility-2` | 前台通知横幅使用 Reanimated `SlideInUp/SlideOutUp` 固定滑入/滑出，未读取 reduced-motion。 | reduce 时改为静态出现/消失或短淡入，避免系统“减少动态效果”下仍大幅滑动。 |
| ✅ `apps/mobile/src/features/chat/MapPanel.tsx:579` | `accessibility-12`, `interactivity-3` | 地图网格点击层是全屏透明 Pressable，核心操作“点击地图放置”缺少可访问说明和非精细指针替代。 | 给地图层补 `accessibilityLabel`/hint；提供行列输入或“选择角色后用方向/步进移动”替代路径。 |
| ✅ `apps/mobile/src/features/chat/MapPanel.tsx:637` | `accessibility-12`, `interactivity-20` | “更换地图 / 清空”按钮未见 role/state；清空地图会移除地图和所有角色落位，是高影响操作。 | 补 role/label/disabled state；清空确认文案中强调会移除所有角色落位。 |
| ✅ `apps/mobile/src/features/chat/MapPanel.tsx:700` | `typography-2/accessibility-8` | 未落位角色头像 grid 依赖头像/短名；长角色名或相似头像下可辨识度不足。 | 每个角色 token/头像 Pressable 的 `accessibilityLabel` 包含完整角色名、是否已选中和当前落位状态。 |
| ✅ `apps/mobile/src/features/chat/ChatShell.tsx:1748` | `accessibility-12` | 右抽屉遮罩是空 Pressable，仅用于关闭，未见 label/role；读屏可能聚焦到无名区域。 | 设置 `accessibilityLabel="关闭右侧面板"` 与 role，或从无障碍树隐藏遮罩并提供显式关闭按钮。 |
| ✅ `apps/mobile/src/features/chat/ExpressionPickerSheet.tsx:251` | `accessibility-12`, `typography-2/accessibility-8` | 表情贴纸网格每个贴纸是无 label 的图片 Pressable；读屏用户无法区分贴纸。 | 用贴纸名/文件名生成 `accessibilityLabel="发送表情 {name}"`，上传时要求或自动生成可读名称。 |
| ✅ `apps/mobile/src/features/chat/CombatPanel.tsx:245` | `typography-2/accessibility-8` | 角色状态卡的角色名 `numberOfLines={1}`，长角色名截断后只能靠头像/首字区分。 | 给整张状态卡或名称文本补完整 `accessibilityLabel`，必要时长按展示完整角色名。 |
| ✅ `apps/mobile/src/features/chat/CombatPanel.tsx:265` | `typography-2/accessibility-8` | 属性 pill 把标签和值拼成短文本，多个状态并排时读屏与视觉扫描都缺少结构。 | 将状态区组织为可读列表，例如 `HP 当前值/修正值`；读屏 label 用完整字段名。 |
| ✅ `apps/mobile/src/features/chat/CommandRequestCard.tsx:88` | `copywriting-7` | hint 文案“点击此进行检定”偏口语且不说明不可用原因和执行后果。 | 改为“点按执行此检定”；disabled 时优先读出 `disableReason`，已执行时读“此检定已执行”。 |
| ✅ `apps/mobile/src/features/messages/MobileMessageMediaPreview.tsx:180` | `typography-2/accessibility-8` | 媒体文件名多处 `numberOfLines={1}`，长文件名截断后难以区分相似附件。 | 文件名文本或卡片 `accessibilityLabel` 使用完整文件名；必要时提供长按复制文件名。 |
| ✅ `apps/mobile/src/features/roles/edit/AvatarGrid.tsx:413` | `accessibility-12`, `typography-2/accessibility-8` | 头像 tile 是 Pressable，片段未显示 role/label；管理头像时只靠图片/选中视觉区分。 | 每个头像按钮补 `accessibilityLabel`，包含头像名称/序号、是否选中、点按会编辑或选择。 |
| ✅ `apps/mobile/src/features/roles/edit/AvatarGrid.tsx:451` | `accessibility-7`, `interactivity-20` | 单个删除头像徽标是小 Pressable，未见 label/hitSlop；删除头像是高影响操作。 | 补 `accessibilityLabel="删除头像"`、hitSlop 和确认/撤销路径。 |
| ✅ `apps/mobile/src/features/roles/edit/AvatarGrid.tsx:486` | `accessibility-12`, `interactivity-21` | 批量删除按钮有 disabled 视觉但片段未显示 `accessibilityState`；多选/管理模式切换也不完全统一。 | 给批量删除、进入多选、进入管理补 button role、state 和选中数量说明。 |
| ✅ `apps/mobile/src/features/chat/MobileMessageCards.tsx:164` | `typography-2/accessibility-8` | 转发预览消息 `numberOfLines={1}`，摘要被截断后无法读取完整内容。 | 详情 Sheet 的打开按钮 label 中包含“查看全部转发消息”；预览项在详情里提供完整文本。 |
| ✅ `apps/mobile/src/features/chat/MobileMessageCards.tsx:241` | `typography-2/accessibility-8` | 转发详情里的说话人/消息标题 `numberOfLines={1}`，长角色名会截断。 | 详情行 `accessibilityLabel` 拼接完整说话人和消息摘要。 |
| ✅ `apps/mobile/src/features/chat/MobileMessageCards.tsx:371` | `typography-2/accessibility-8` | 文档/线索/跳转卡片标题多处 `numberOfLines={1}`，长标题缺少完整读取路径。 | 卡片按钮 label 使用完整标题与动作，例如“打开文档 {title}”。 |
| ✅ `apps/mobile/src/features/chat/MobileCluePanel.tsx:447` | `accessibility-12`, `typography-2/accessibility-8` | 线索文件夹 tab 是 Pressable，房间名 `numberOfLines={1}`；当前选中只靠颜色表达。 | 补 button role、完整房间名 label 和 `accessibilityState={{ selected: active }}`。 |
| ✅ `apps/mobile/src/features/friends/DmMessageActionMenu.tsx:58` | `interactivity-20`, `copywriting-7` | “撤回 / 举报”是高影响或敏感操作，但 action menu 本身没有 `accessibilityHint` 说明后续是否会确认。 | 为撤回和举报补 hint，例如“会打开确认提示”或“提交后会通知管理员”。 |
| ✅ `apps/mobile/src/components/ErrorBoundary.tsx:103` | `accessibility-12`, `interactivity-21` | 错误页复制/分享/导出/提交反馈/重试全是 Pressable，片段未显示 role/state。 | 给所有操作补 button role；异步导出/分享时补 busy，重试说明会重新加载当前界面。 |
| ✅ `apps/mobile/src/features/notifications/BackgroundPushOnboardingBridge.tsx:137` | `accessibility-12` | 后台推送引导 Modal 用背景 Pressable 关闭、内容 Pressable 阻止冒泡，未见 dialog/遮罩语义。 | 背景补“关闭后台推送提醒”或隐藏；内容容器补 dialog label。 |
| ✅ `apps/mobile/src/features/notifications/BackgroundPushOnboardingBridge.tsx:151` | `accessibility-12`, `copywriting-7` | “去开启后台权限 / 关闭电池优化 / 检查通知权限 / 不再提醒”按钮未见 role/label/hint。 | 补 button role；每项 hint 说明会打开系统设置或关闭后续提醒。 |
| ✅ `apps/mobile/src/features/notifications/NotificationDeliveryDiagnosticsCard.tsx:327` | `accessibility-12`, `interactivity-21` | 通知诊断刷新和设置按钮未见 role/state；刷新中只靠 opacity。 | 补 button role、`accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}`。 |
| ✅ `apps/mobile/src/features/notifications/NotificationDeliveryDiagnosticsCard.tsx:339` | `copywriting-7` | “通知设置 / 电池优化 / 后台权限”按钮没有解释为什么要打开这些系统页。 | 在按钮 hint 或说明文本中写明对应问题，例如“用于允许后台消息提醒”。 |
| ✅ `apps/mobile/src/components/BottomSheetModal.tsx:161` | `accessibility-12`, `interactivity-3` | 底部弹窗拖拽 handle 只有手势，没有键盘/读屏可操作语义；移动端读屏用户无法知道可拖拽。 | 为 handle 区域增加 `accessibilityLabel`/hint，必要时提供“关闭/展开”显式按钮。 |
| ✅ `apps/mobile/src/features/friends/PendingRequestsTab.tsx:112` | `typography-2/accessibility-8` | 用户名和验证消息都 `numberOfLines={1}`，但操作按钮 label 只含用户名。 | 行容器或按钮 hint 补完整验证消息，长按/详情可查看完整申请理由。 |
| ✅ `apps/mobile/src/features/chat/ChatMessageItem.tsx:299` | `accessibility-12` | 多选模式下消息整行是 Pressable，但未见 role/label/state；选中状态只靠视觉圆点/背景。 | 补 `accessibilityRole="checkbox"` 或 button role，`accessibilityState={{ checked: isMultiSelected }}`，label 含消息摘要。 |
| ✅ `apps/mobile/src/features/chat/ChatMessageItem.tsx:325` | `accessibility-12` | 多选勾选标记只显示 “✓”，读屏不会知道当前消息已选中。 | 将选中状态放入 Pressable state/label，视觉勾选设为隐藏或装饰。 |
| ✅ `apps/mobile/src/features/chat/ChatMessageItem.tsx:371` | `accessibility-12`, `copywriting-7` | 普通消息行长按打开操作菜单，但 Pressable 未见 label/hint；读屏用户不知道长按可操作。 | 补 `accessibilityLabel` 包含发言人和消息摘要，`accessibilityHint="长按打开消息操作"`。 |
| ✅ `apps/mobile/src/features/chat/ChatMessageItem.tsx:412` | `typography-2/accessibility-8` | 回复预览 `numberOfLines={1}`，长回复被截断后没有完整读取路径。 | 消息行 label 或回复预览区域补完整被回复内容，必要时提供“查看原消息”。 |
| ➖ `apps/mobile/src/components/TextEnhanceRenderer.tsx:116` | `typography-2/accessibility-8` | 增强文本继承 `numberOfLines` 截断，但未为包含 ruby/样式的长文本提供完整读取路径。 | 在承载消息/卡片的父级 accessibilityLabel 中保留原始完整文本。 |

### 全局 polish / 浏览器 chrome / 桌面壳

| 位置 | 规则 | 可修改细节 | 建议修改 |
| --- | --- | --- | --- |
| `apps/web/index.html:10` | `design-9` | 当前只声明 `/favicon.ico`，未看到 light/dark favicon 变体。 | 增加 `favicon-light.svg` / `favicon-dark.svg` 并用 `prefers-color-scheme` media 区分。 |
| `apps/web/app/components/common/textEnhanceAnimations.css:12` | `motion-15/accessibility-2` | 文本增强提供大量循环 keyframes，作为用户生成内容效果时可能持续播放；文件内未看到 reduced-motion 包裹。 | 在 CSS 中为 `prefers-reduced-motion: reduce` 提供禁用/降级策略，或渲染层按用户偏好过滤循环动画。 |
| `apps/web/app/components/common/scrollbar.css:1` | `design-6`, `design-7` | 多处使用 `hidden-scrollbar` 完全隐藏滚动条；在长列表/弹窗中可能损失滚动 affordance。 | 对主要内容滚动区优先使用低对比细滚动条；只在短横向 chip/list 中隐藏。 |
| ✅ `apps/desktop/src/main/index.ts:36` | `interactivity-20`, `copywriting-7` | `update-downloaded` 后直接 `autoUpdater.quitAndInstall()`，用户没有看到“现在重启 / 稍后”选择；长流程编辑时可能突然中断。 | 下载完成后用 Electron `dialog` 或 renderer 通知提示重启，并提供“稍后”路径；同时记录更新版本号。 |

## 后续待复核队列

1. Web 角色详情剩余弹窗：骰娘关联、角色创建/编辑相关弹窗可统一 Modal 化。
2. 移动端其它页面：动态/探索列表、地图 token 详情、通知设置诊断卡继续抽查。
3. Electron 专属体验：系统通知、下载进度可视化、平台快捷键与安装包图标资产落地继续复核。
4. 全局长列表：继续把 `hidden-scrollbar` 调用点分成“短工具条”和“主要内容滚动区”。

