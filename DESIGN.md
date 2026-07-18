# 团剧共创 设计系统规范

> 本文档定义项目的统一设计语言。审计问题见 `d:/A_collection/UI-UX-设计审计报告.md`。

## Design Token（`apps/web/app/app.css` 的 `@theme`）

- **颜色**：统一用 daisyUI 语义色 —— `base-100/200/300`、`base-content`、`primary`/`secondary`/`accent`/`neutral`/`error`/`warning`/`info`/`success` 及其 `-content`，支持透明度后缀（`base-content/60`）。
  - **禁止**裸用 `gray-*`/`rose-*`/`slate-*`/`emerald-*` 等原始色相类（不随主题切换，破坏暗色）。
  - 硬编码 hex（`bg-[#xxx]`）原则上禁止；功能性必需色见末节。
- **颜色语义**：
  - **灰色是结构色**：默认图标、文字、边框、背景仍用 `base-content`、`base-100/200/300` 等中性色；蓝/黄/红/绿只在需要表达状态时出现。
  - **主状态色固定基准**：不要自行挑选新的蓝/黄/红/绿，也不要通过覆盖全局 token 临时改色；主状态色固定跟随项目里已经确认的实际 UI 色感。
    - **主蓝**：固定以顶部导航和 space bar 的图标填色蓝为准，用于选择、可选择、当前焦点。
    - **主黄**：固定以 space bar 折叠态黄色为准，用于特殊状态、临时状态、注意但不危险。
    - **主红**：固定以顶部 Bug 反馈 / 反馈问题红色为准，用于危险、破坏、错误。
    - **主绿**：固定以 WebGAL 渲染 / 实时运行状态绿色为准，用于正在运行、已连接、正常进行中。
  - **蓝色 = 选择 / 可选择 / 当前焦点**：用于当前页、当前会话、当前房间、选中的 tab、可交互 hover/focus，是主交互色。实现上优先用 `info`/`info-content` 系列。
  - **黄色 = 特殊状态 / 临时状态 / 注意但不危险**：用于折叠态、预览态、等待确认、未完全展开、状态变化提示；不要和警告/错误混用。实现上优先用 `warning`/`warning-content` 系列。
  - **红色 = 危险 / 破坏 / 错误**：用于删除、退出、清空、失败、不可逆操作；红色按钮只在真正危险时出现。实现上优先用 `error`/`error-content` 系列。
  - **绿色 = 正在运行 / 已连接 / 正常进行中**：用于 WebGAL 运行中、实时渲染开启、同步连接成功、任务活跃；避免用绿色表示“选中”，以免和蓝色主交互语义冲突。实现上优先用 `success`/`success-content` 系列。
- **默认图标**：默认/非激活状态统一使用镂空线性图标，默认继承 `currentColor`；线宽保持一致，优先使用 `1.75px` 或 `2px`，避免同一界面的默认态混用填充图标、双色图标和不同线宽的图标。
- **图标选中态**：暂时只采用“图标本身填色”表达简单状态。对于聊天、顶部导航、space 选择这类单个图标且语义清晰的入口，选中/当前态直接让图标继承对应状态色（如 `text-info`），不额外增加浅色容器底或反选实底。
- **复杂对象例外**：当视觉对象本身不可控或信息复杂（例如 room avatar、用户上传头像、缩略图等），仅靠图标/图片颜色无法清晰表达状态时，允许使用外层容器填色、边框或 ring 区分当前/选中态。
- **圆角**：只用 `rounded-{none,sm,md,lg,xl,2xl,full}`；daisyUI 组件圆角由 `--radius-selector/field/box` 统一为 `0.375rem`。禁止 `rounded-[Xpx]` 任意值。
- **阴影（elevation）**：只用 `shadow-{none,sm,md,lg,xl}`。禁止 `shadow-[...]` 自定义。
- **字体**：`Inter`（`--font-sans`，含 emoji 回退栈）。
- **间距**：用 Tailwind 默认 scale（`p-2/3/4`、`gap-2/3` 为主），禁止任意像素值。
- **动效（motion）**：
  - 时长 `--duration-{fast,base,slow,slower}` = 150/200/300/500ms（语义命名档，与 Tailwind 默认数字档对齐）。Tailwind 侧用 `duration-150/200/300/500` 裸值；motion 侧用 `motionDuration`（秒）镜像。
  - 缓动：基础曲线直接用 Tailwind 内置 `ease-out`/`ease-in-out`/`ease-in`（本就是语义名，motion 侧对应 `"easeOut"`/`"easeInOut"`/`"easeIn"`）；仅 `--ease-emphasized`（项目独有、Tailwind 未内置）自动生成 `ease-emphasized` 工具类。**禁止**散写 `ease-[cubic-bezier(...)]` 任意值或 CSS `cubic-bezier()` 字面量。
  - motion（`motion/react`）侧镜像见 `components/common/motion/motionTokens.ts`（`motionEase.emphasized`、`motionDuration` 秒）；共享 motion 配置文件统一引用。
  - `prefers-reduced-motion` 由 `__root.tsx` 的 `MotionConfig reducedMotion="user"` 全局兜底；CSS 侧按需用 `motion-reduce:` 变体。

## 组件库（`apps/web/app/components/common/`）

| 组件 | 用途 | 替代的旧实现 |
|---|---|---|
| `Button` / `IconButton` | 统一按钮（tone/appearance/size/shape/loading/icon）；IconButton 强制 aria-label | 散写的 `className="btn ..."` |
| `DialogFrame` / `DialogActions` | 统一弹窗遮罩、悬浮表面、Esc、aria、操作区与进出场动效；弹窗不显示右上角 X | 各自实现的 overlay/动画/scroll-lock |
| `ConfirmDialog` | 声明式 + 命令式 `confirm({...}): Promise<boolean>`（`ConfirmDialogProvider` 挂 `__root`） | `comfirmModel.tsx`(已删)、`window.confirm`、aiImage `HistoryConfirmModal`(薄封装) |
| `FormField` / `ChoiceField` / `FieldGroup` / `FieldLabel` / `FieldDescription` / `FieldError` | 统一标签、说明、错误及可访问关联 | 各业务字段布局 |
| `TextInput` / `TextArea` / `SelectInput` | 统一文本类输入的密度、表面和状态 | 散写的 `input`/`textarea`/`select` class |
| `Checkbox` / `Radio` / `Switch` / `RangeInput` | 统一选择控件与滑杆的密度、焦点和禁用状态 | 散写的 checkbox/radio/toggle/range class |
| `Surface` / `Text` | 三层表面与固定文字角色 | 散写的背景、边框、阴影和字号组合 |
| `Tabs` / `DropdownMenu` / `MenuSurface` / `MenuItem` / `PopoverSurface` | 页签、菜单和轻浮层的状态、键盘与关闭行为 | 各业务自建 tabs/menu/popover |
| `Badge` / `StatusIndicator` / `Divider` / `ProgressBar` / `Skeleton` / `InlineAlert` / `LoadingIndicator` / `appToast` / `AppToaster` | 次级控件和反馈原语 | 各模块散写 badge/indicator/progress/skeleton/alert/loading/toast |
| `Disclosure` / `ControlGroup` | 折叠区与相邻控件组的语义、圆角和边框 | `collapse` / `join` 类结构 |
| `StateView` | 加载、空态、错误、重试、离线、刷新和进度 | 各模块独立内容状态 |
| `MediaFrame` / `MediaImageFrame` / `UploadDropZone` | 图片比例、裁切、占位、失败、预览、选中和上传拖放 | 各业务媒体容器与上传区域 |
| `Avatar` | 头像壳 + 尺寸档位 + 图片回退（业务头像复用其 `AVATAR_SIZE_CLASS`/`AVATAR_HOVER_*`） | UserAvatar/RoleAvatar 内重复的 sizeMap |
| `OpenAbleDrawer` | 挤压式响应抽屉（大屏拖拽宽度、小屏覆盖） | — |
| `VaulSideDrawer` | 浮层式抽屉（不挤压布局） | — |
| `PortalTooltip` | Portal 渲染、智能定位的 tooltip | — |

**新代码优先使用上述组件**。业务结构保持在业务组件中，公共层只承载跨模块稳定重复的视觉语法、状态与可访问行为。

业务组件只使用公共 React 原语、语义 helper 与 Tailwind 布局类。`btn`、`badge`、`card`、`menu`、`modal` 等 daisyUI 组件类，以及 `tc-*` 内部实现类，仅允许出现在公共原语内部。

### 跨模块统一边界

- **统一基础语法**：颜色语义、圆角与阴影档位、文字角色、间距档位、焦点环、禁用、只读、错误、加载与 reduced motion。
- **统一稳定原语**：按钮、图标按钮、表单字段、弹窗、Toast、内容状态、Tooltip、头像与媒体加载行为。
- **保留业务结构**：聊天室消息流、AI 绘画工作区、角色编辑器及其业务列表各自实现。
- **抽取判断**：视觉语法、状态模型、键盘行为三项稳定重复时进入公共层；单纯外形相似继续共享 class helper 或 token。

### 表面层级

- **画布层**：页面或工作区底层使用 `base-200`，承载大区域和滚动背景。
- **内容层**：输入、卡片和主要内容使用 `base-100` + `border-base-300`，默认 `rounded-md`。
- **悬浮层**：Dialog、Popover、Menu、Tooltip 使用内容层颜色 + `shadow-lg/xl`，遮罩和层级由公共组件管理。
- **嵌套层**：内容层内的次级区域使用 `base-200`；避免连续嵌套阴影，通过背景与边框建立层级。

### 文字角色

- **标题**：页面 `text-page-title`，区块 `text-section-title`，组件 `text-component-title`；分别映射固定字号、行高与字重。
- **正文**：`text-body`；长正文通过 `Text wrap="pretty"` 处理。
- **辅助信息**：`text-supporting text-base-content/60`；交互提示最低保持 `/60`。
- **标签、数字和代码**：`Text` 的 `label`、`data`、`code` 角色分别固定字重、等宽数字和等宽字体。
- **长文本**：`balance`、`pretty`、`truncate`、`line2` 五种固定策略由 `Text` / `textClassName()` 提供。

### 尺寸与节奏

- **密度**：公共原语只提供 `compact` / `default` 两档；页面自行组合布局密度。
- **控件高度**：`h-control-compact` = 32px，`h-control-default` = 40px。
- **图标尺寸**：`size-icon-compact` = 16px，`size-icon-default` = 20px。
- **触控热区**：`size-hit-compact` = 32px，`size-hit-default` = 44px。
- **内部节奏**：紧凑控件以 `gap-1/1.5`、`px-2/2.5` 为主，默认控件以 `gap-2`、`px-3/4` 为主。

### 表单语法

- `FormField` 负责标签、说明、错误和 `aria-describedby` / `aria-invalid` 关联。
- `ChoiceField` 负责复选框、单选框、开关的标签、说明与错误关联。
- `FieldGroup`、`FieldLabel`、`FieldDescription`、`FieldError` 负责无法直接套用 `FormField` 的复合字段结构。
- `TextInput`、`TextArea`、`SelectInput` 负责 `compact/default` 密度、`default/muted` 表面，以及 hover、focus、disabled、readonly、invalid 状态。
- `Checkbox`、`Radio`、`Switch`、`RangeInput` 统一蓝色选择语义、焦点环和禁用态。
- 复合输入通过 `formControlClassName()` 复用同一状态语法，业务组件继续控制前后缀、浮层与快捷操作。

### 状态语法

- **hover**：中性表面轻微加深；危险动作使用 `error/10`。
- **pressed**：`base-300` 表面反馈；按钮通过原生 `:active` 表达。
- **选中强度**：统一通过 `selectionClassName({ level })` 选择以下四档，并由 `aria-current`、`aria-pressed`、`aria-selected` 或 `data-selected` 标记语义。

| 等级 | 视觉表达 | 使用场景 |
|---|---|---|
| `tone` | `text-info` | 空间栏、图标入口等最轻当前态 |
| `soft` | `info/10` 背景 + `text-info` | Tab、菜单项、筛选项和轻量开关 |
| `strong` | `info/15` 背景 + `1px info/70` 内描边 | 当前房间、当前私聊、当前文档等持续导航定位 |
| `solid` | `bg-info` + `text-info-content` | 已选卡片、确认性选择和需要最高识别度的单选结果 |

- **focus**：全局 `focus-visible` 使用 2px `info/24` 焦点环与 2px offset。
- **disabled / readonly / loading**：分别使用禁用指针与 45% 透明度、弱化表面与只读文字、`aria-busy` + spinner/progress。
- **拖放目标**：`tc-drop-target` + `data-drag-state="active"` 使用虚线边框、`info/10` 背景和焦点 ring。

### 内容状态

- `Skeleton` 用于结构已知的首屏与局部加载，统一 `base-content/10` 和 reduced-motion。
- `StateView kind="empty|loading|error|offline|refreshing|progress"` 用于区域级状态；`actionLabel/onAction` 负责重试或恢复动作。
- `ProgressBar` 用于可量化任务；局部刷新保留当前内容并在所属区域标记 `aria-busy`。
- `InlineAlert` 用于页面流内持续可见的局部反馈；`appToast` 用于由全局 `AppToaster` 承载、自动消失的临时浮层通知。两者使用一致的四档语义外观；Toast 始终保持不透明表面，并额外保留浮层阴影、宽度、时长和进出场。

### 即时数据交互

- **必须乐观更新**：可逆、结果可预测、已有 React Query 唯一缓存源的实体变更，例如选中、排序、订阅、成员增删、身份切换、已读和归档。
- **保持 pending**：依赖服务端生成 ID 或内容的创建操作、登录与安全验证、文件上传、AI 生成、导入和不可逆外部副作用。
- **统一协议**：`cancel → optimistic patch → error rollback → success reconcile → settled invalidate`；跨模块快照事务使用 `@tuanchat/query/optimistic-cache`。
- **并发规则**：回滚只恢复仍由当前事务持有的缓存引用；出现更晚的并发写入时保留新值，并通过 settled 重新校准服务端状态。
- **业务失败**：接口返回 `success: false` 时必须抛出 mutation 错误，确保进入回滚路径。
- **缓存边界**：React Query 已缓存的数据直接修改唯一缓存；业务组件不再维护同一实体的临时“已添加／已删除”副本。

### 次级控件

- `Tabs` 统一互斥切换的选中态、两档密度、方向键、Home/End 和禁用页签跳过。
- `MenuSurface` / `MenuItem` 统一菜单表面、热区、危险项和选中态；`PopoverSurface` 统一 Esc 与外部点击关闭。
- `DropdownMenu` 统一触发器、定位、`aria-expanded`、Esc、外部点击和选择后关闭行为。
- `PortalTooltip` 统一悬浮表面、最大宽度、延迟与 reduced-motion。
- `Badge` 表达静态状态和数量，`Divider` 表达结构边界，`ProgressBar` 表达任务进度。

### 媒体语言

- **比例**：`square`、`portrait`、`landscape`、`video`、`auto` 五档，由 `MediaFrame` 统一。
- **裁切**：头像、封面和缩略图使用 `cover`；完整作品、立绘与参考图预览使用 `contain`。
- **头像形状**：头像和缩略图通过 `maskClassName({ shape: "squircle" })` 统一使用 squircle 裁切；底层 `mask` class 只在 `DesignLanguage.tsx` 内维护。
- **状态**：`MediaImageFrame` 统一骨架、加载过渡、失败占位、重试、预览入口和蓝色选中框。
- **上传**：`UploadDropZone` 统一点击、键盘、拖入、放置、禁用、文件类型说明和活动目标反馈。

### 四档语义外观

- **共享合约**：`SEMANTIC_APPEARANCES = solid / soft / outline / ghost` 是语义色表面的跨组件事实源；适用于 `Button`、`IconButton`、`Badge`、`CountBadge`、`InlineAlert` 与 `appToast`。
- **强度定义**：`solid` 是完整语义色填充，`soft` 是低浓度语义色填充，`outline` 是透明内容背景加语义边框，`ghost` 不保留常驻背景与可见边框。
- **完整性要求**：适用组件新增任何颜色时，必须同时提供四档外观，并在设计系统页展示完整矩阵。
- **默认外观**：`Badge`、`InlineAlert` 与 `appToast` 默认 `soft`，`CountBadge` 默认 `solid`；按钮由动作层级显式选择。
- **实心配额**：同一操作区最多出现一个 `solid`；最终危险确认使用危险色 `solid` 时，它就是该操作区唯一的实心动作。
- **选中态独立**：`soft` 只表示次强调外观，不表示选中。页签、菜单项、当前对象等持续选中状态继续使用 `selectionClassName({ level })` 与对应 ARIA 状态。
- **Toast 例外**：Toast 属于覆盖在业务内容上方的浮层，四档都保持不透明；其中 `outline` 只保留语义边框，`ghost` 只移除可见边框，避免背景信息干扰。
- **不适用范围**：`ProgressBar`、`Skeleton`、`Divider`、`Tabs`、表单控件和 `StateView` 使用各自结构状态，不添加无意义的四档外观属性。

### 按钮视觉规范

- **颜色语义**：`tone="neutral|primary|success|warning|error"` 只表达操作语义，不再与填充形式绑定。
- **强调强度**：`appearance="solid|soft|outline|ghost"` 从高到低表达关键、次强调、常规与附属操作。
- **完整合约**：`BUTTON_TONES` 中每种颜色都必须覆盖共享的四档外观；设计系统页与测试从同一清单自动生成，不允许只新增部分外观。
- **使用层级**：主提交、明确确认或最终危险确认使用 `solid`，推荐但非唯一动作使用 `soft`，常规操作使用 `outline`，工具栏与列表附属动作使用 `ghost`；同一操作不得仅靠颜色区分含义。
- **实现入口**：业务代码通过 `Button` / `IconButton` 的 `tone`、`appearance`、`size`、`shape`、`aria-pressed` 等参数表达状态；旧 `variant` 仅保留兼容，不直接散写 daisyUI `btn-*` 或硬编码颜色类。
- **状态一致性**：每种颜色都必须同时支持 `solid` 与 `outline`，并保持一致的 hover、active、focus、disabled 状态。

## 暗色模式

- 三态：`light` / `dark` / `system`（默认 `system`），存于 `localStorage["theme"]`。
- `apps/web/index.html` 内联脚本在 React 加载前按 localStorage + `prefers-color-scheme` 设置 `data-theme`、`dark` class、`meta[theme-color]`，**防首屏闪烁**。同时把旧键 `reverseDarkMode` 一次性迁移到 `theme`。
- `ThemeSwitch` 三按钮（Sun/Moon/Desktop，`aria-pressed` 标识当前态）。
- 旧实现（硬编码 `data-theme="dark"`、`reverseDarkMode = !prefersIsDarkMode` 强制夜间）已移除。

## 反馈机制分工

- **轻提示**（操作反馈，2.5s 自动消失）：`react-hot-toast` 的 `toast.success/error/...`，`<Toaster position="top-center">`。
- **需交互弹窗**：`DialogFrame` / `ConfirmDialog`。
- **命令式业务弹窗**（需注入路由/业务 Context）：`toastWindow()` 继续承载路由与业务 Context 注入，其渲染层统一使用 `DialogFrame`。

## 交互与无障碍（P1 基线）

- **焦点态**：禁止裸 `outline-none`/`focus:outline-none` 而无替代；需 `focus:ring-*` 或 `focus:border-*`（daisyUI 组件自带 focus 样式除外）。
- **动画**：所有 motion/transition 动画须尊重 `prefers-reduced-motion`（用 `useReducedMotion()` 或 `motion-reduce:` 变体）。
- **对比度**：文字透明度遵循 主文字 `base-content` / 次要 `/70` / 辅助 `/50`（更低需评审）。
- **表单**：`<input>` 带 `type`（email/url/tel/number 而非裸 text）、`name`、`autocomplete`（auth 用 username/current-password 等）、可点击 `label[htmlFor]`；提交按钮保持启用、校验错误 inline。
- **触控热区**：紧凑操作使用 32px，默认操作使用 44px；图标尺寸与热区尺寸分离。
- **语义化**：交互元素用 `<button>`/`<a>`，避免 `<div onClick>`。

## 排版

- 语义标题 `<h1>`~`<h3>`（页面/卡片/小节），而非全靠 `text-xl font-bold`。
- 中文长标题用 `text-balance`；正文段落 `text-pretty`。
- 字距、行高用 Tailwind 默认档位，禁止散写 `tracking-[0.18em]` 等任意值。

## 功能必需色（不收敛到 token，保留）

- NovelAI prompt 权重高亮色板（`aiImage/HighlightEmphasisTextarea.tsx`：strengthen/weaken/inverse 按权重着色）。
- Inpaint 遮罩拾色板（`aiImage/inpaintMaskUtils.ts` 的 `MASK_COLOR_OPTIONS` 10 色）。
- 用户头像确定性色板（`profile/.../UserAvatar.tsx`，含 teal）。
- Canvas API `fillStyle`（`#000`）。
- 滚动条中性灰（`aiImageRouteStyles.css` 的 `rgba(148,163,184,*)`）。

## 落地页

- `landing-page` 独立 Astro 站，视觉基调与主应用对齐（跟随系统白/`#030712`，Inter 字体）。未来填充内容时再评估引入主应用 daisyUI 主题。
