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
| `Button` / `IconButton` | 统一按钮（variant/size/shape/loading/icon）；IconButton 强制 aria-label | 散写的 `className="btn ..."` |
| `Modal` | 声明式 `<Modal open onOpenChange>`，原生 `<dialog>`+`showModal()`（自带 focus trap/ESC/scroll lock）+ motion 入场 | 各自实现的 overlay/动画/scroll-lock |
| `ConfirmDialog` | 声明式 + 命令式 `confirm({...}): Promise<boolean>`（`ConfirmDialogProvider` 挂 `__root`） | `comfirmModel.tsx`(已删)、`window.confirm`、aiImage `HistoryConfirmModal`(薄封装) |
| `Avatar` | 头像壳 + 尺寸档位 + 图片回退（业务头像复用其 `AVATAR_SIZE_CLASS`/`AVATAR_HOVER_*`） | UserAvatar/RoleAvatar 内重复的 sizeMap |
| `Card` | 卡片容器基线（rounded-lg + base-300 边框 + shadow-sm，可选 interactive） | 散写的 `border bg rounded shadow` |
| `OpenAbleDrawer` | 挤压式响应抽屉（大屏拖拽宽度、小屏覆盖） | — |
| `VaulSideDrawer` | 浮层式抽屉（不挤压布局） | — |
| `PortalTooltip` | Portal 渲染、智能定位的 tooltip | — |

**新代码必须用上述组件**，不再散写 `btn`/`modal`/`overlay`。

### 按钮视觉规范

- **默认按钮形态**：后续所有按钮优先采用空心/轮廓样式，背景保持透明或贴合所在容器，仅用 `border-base-300`、`text-base-content`、图标与轻量 hover/focus 态表达可点击性。
- **选中/激活态**：按钮被选中、当前页、当前筛选项或当前工具激活时，统一使用蓝色强调；优先采用中性底 + `text-info` / `border-info` / `ring-info` 的轻量状态，只有强确认或大面积主操作才使用填充态。避免每个业务场景自行定义高亮色，也避免用绿色表示“选中”。
- **实现入口**：业务代码继续通过 `Button` / `IconButton` 的 `variant`、`size`、`shape`、`aria-pressed` 等参数表达状态，不直接散写 daisyUI `btn-*` 或硬编码颜色类。
- **例外**：破坏性操作、成功/警告/错误反馈按钮可使用对应语义色，但仍应保持默认空心、选中/确认时填充的状态层级。

## 暗色模式

- 三态：`light` / `dark` / `system`（默认 `system`），存于 `localStorage["theme"]`。
- `apps/web/index.html` 内联脚本在 React 加载前按 localStorage + `prefers-color-scheme` 设置 `data-theme`、`dark` class、`meta[theme-color]`，**防首屏闪烁**。同时把旧键 `reverseDarkMode` 一次性迁移到 `theme`。
- `ThemeSwitch` 三按钮（Sun/Moon/Desktop，`aria-pressed` 标识当前态）。
- 旧实现（硬编码 `data-theme="dark"`、`reverseDarkMode = !prefersIsDarkMode` 强制夜间）已移除。

## 反馈机制分工

- **轻提示**（操作反馈，2.5s 自动消失）：`react-hot-toast` 的 `toast.success/error/...`，`<Toaster position="top-center">`。
- **需交互弹窗**：`<Modal>` / `<ConfirmDialog>`。
- **命令式业务弹窗**（需注入路由/业务 Context）：`toastWindow()`（60 文件依赖，保留；其内部 `ToastWindowFrame` 仍可用，未来可选地改用 `<Modal>`）。

## 交互与无障碍（P1 基线）

- **焦点态**：禁止裸 `outline-none`/`focus:outline-none` 而无替代；需 `focus:ring-*` 或 `focus:border-*`（daisyUI 组件自带 focus 样式除外）。
- **动画**：所有 motion/transition 动画须尊重 `prefers-reduced-motion`（用 `useReducedMotion()` 或 `motion-reduce:` 变体）。
- **对比度**：文字透明度遵循 主文字 `base-content` / 次要 `/70` / 辅助 `/50`（更低需评审）。
- **表单**：`<input>` 带 `type`（email/url/tel/number 而非裸 text）、`name`、`autocomplete`（auth 用 username/current-password 等）、可点击 `label[htmlFor]`；提交按钮保持启用、校验错误 inline。
- **触控热区**：可点击图标 ≥ 24px（`btn-xs`/`size-6`）。
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
