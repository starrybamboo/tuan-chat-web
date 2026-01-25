# BlockSuite 引入后的样式回归与代码审计要点（仅建议清单）

## 范围与结论
- 目标：恢复站点原有 CSS 观感，同时保留 BlockSuite（AFFiNE）编辑器/弹层样式；不处理 `app/components/chat/infra/blocksuite/playground/**` 的工程化治理。
- 现状：`pnpm typecheck` / `pnpm build` 通过；`pnpm lint` 仍有较多错误（大量来自 playground 命名/规则不匹配）。

## 已落地修复（CSS 回归）
- 已将业务侧的 BlockSuite 样式引入从 `playground/style.css` 解耦：`BlocksuiteDescriptionEditor` 改为在初始化时按需加载 `blocksuiteRuntime.css`，避免静态引入 playground 样式。
- 已为 BlockSuite 容器增加统一 scope：`.tc-blocksuite-scope`（便于后续继续隔离全局副作用）。
- 已处理 KaTeX 的 `body{counter-reset:...}` 全局副作用：在 blocksuite layer 内覆盖为 `counter-reset:none`，并把 reset 移到 `.tc-blocksuite-scope`。
- 已移除对 Tailwind `.hidden` 的 `!important` 全局覆写（该覆写会破坏 `hidden lg:flex` 等响应式显示逻辑，导致宽屏菜单/Tab 等元素“永远隐藏”）。
- 已注册 BlockSuite 的 CSS layer：在 `app/app.css` 顶部声明 `@layer blocksuite;`，确保 blocksuite 的按需样式始终落在低优先级 layer，避免插队覆盖站点样式。
- 已为站点增加 DaisyUI 主题兜底：`app/root.tsx` 的 `Layout` 默认设置 `data-theme="light"`，避免未挂载 `ThemeSwitch` 的页面缺失主题变量导致按钮/tooltip/配色异常（`ThemeSwitch` 仍会在挂载后覆盖为用户实际主题）。
- （可选兜底）在 `app/app.css` 中补充 `@source` 规则，显式声明 Tailwind 扫描范围（app/api/electron），便于后续将扫描根从全量 `**/*` 收敛到业务目录。

## P0：CSS 回归（最优先）
- 当前 BlockSuite 的样式链路（业务页）来自 `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css`（按需加载），其中包含 `@toeverything/theme` 的 `style.css`/`fonts.css` 与 `katex.min.css`。
- playground 仍由 `app/components/chat/infra/blocksuite/playground/style.css` 引入上述依赖（仅影响 playground 路由）。
- `@toeverything/theme/dist/style.css` 包含 `:root { --affine-* }` 全局变量；`katex.min.css` 末尾包含 `body{counter-reset:...}` 全局规则（已在 `blocksuiteRuntime.css` 内覆盖/迁移到 scope）。
- 建议方案（从安全到激进）：
  1) **按需加载**：仅在 BlockSuite 组件挂载时动态注入这些 CSS（不在全站静态 import）。
  2) **作用域化**：把 `:root` 变量与 KaTeX 的 `body{...}` 改为挂到 BlockSuite 容器/portal（例如 `.tc-blocksuite-scope` 与 `.blocksuite-portal`），避免污染站点 `html/body`。
  3) **拆分资源**：把 “theme/fonts/katex” 从 `playground/style.css` 迁出到独立 `blocksuite-theme.css`，并明确只允许变量/组件级选择器，不允许 `body/html/*` 级别重置。

## P1：BlockSuite 注入点与潜在风险
- ✅ 已修复：`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 不再静态引入 `playground/style.css`，改为初始化时按需加载 `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css`。
- `app/root.tsx` 对 `customElements.define` 做了运行时 monkey-patch：建议 **仅 DEV** 启用，生产应避免“静默吞错”掩盖真实重复注册/多版本 Lit 问题。
- `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.ts` 注册了全局事件监听（`document.addEventListener(..., true)`）：目前用 once-guard 限制重复，但仍建议改为可卸载/更局部的策略。

## P2：业务代码质量（按模块优先级推进）
- chat/blocksuite：清理 `console.debug` 与未清理的 `setTimeout`（lint 已提示）；把 playground 相关 lint 规则隔离掉，恢复业务 lint 信号。
- common：`app/components/common/markdown/markDownViewer.tsx` 使用 `rehype-raw`（已配 `rehype-sanitize`）+ `@ts-expect-error`；建议补充 sanitize schema（按允许的标签/属性）并消除该 TS 忽略。
- profile：`app/components/profile/cards/GNSSpiderChart.tsx` 存在 `console.error` 与 TODO（建议用统一 toast/日志）。

---

# 模块扫描（按约定顺序）

## 1) chat（不含 blocksuite playground 治理）

### 发现的问题（按优先级）
- P1：计时器较多（`setTimeout/setInterval` 共 22 处，集中在 `chatFrame.tsx`、`roomWindow.tsx`、`chatRoomListPanel.tsx` 等），存在“未清理导致泄漏/重复触发”的风险；与 React 严格模式/重复挂载叠加时更容易出现重复订阅/重复请求。
- P1：本地存储/IndexedDB 使用点较多（`localStorage/sessionStorage/indexedDB` 共 39 处，集中在 `stores/*Store.ts`、`roomPreferenceStore.ts`、`realtimeRenderStore.ts` 等），风险点是 key 命名不统一、版本迁移困难、异常捕获不一致、以及 SSR/多标签页并发一致性问题。
- P2：控制台输出较多（约 29 处；热点 `realtimeRenderOrchestrator.tsx`），建议引入统一 logger（DEV 直出、PROD 降噪/采样/上报）并明确哪些 log 属于业务可观测性、哪些属于临时调试。
- P2：存在少量 `eslint-disable`（主要散落在 `chatFrame.tsx`、`memberLists.tsx`、`core/hooks.tsx`、`workflowWindow.tsx`、`spaceSettingWindow.tsx` 等），需要逐条确认是否可以用更精确的代码改动替代“整条规则禁用”。

### 修复建议（面向你明天落地）
- 计时器统一治理：把多处 `setTimeout` 改为“单一调度器 + 清理函数”；对 UI 动画/延迟滚动用 `requestAnimationFrame`/`AbortController` 取代；所有 effect 内计时器必须在 cleanup 里 clear。
- 本地存储统一治理：集中定义 `storage keys`（含版本号/命名空间）、封装 `safeGet/safeSet`（try/catch + JSON schema/默认值）、为关键 store 增加迁移函数；必要时用 `BroadcastChannel` 做多标签页同步。
- 控制台输出治理：将“诊断日志”切到 logger；禁止生产 `console.debug/log`；对 `console.warn/error` 明确是否要上报（Sentry/自建接口）。

> 说明：chat 内与 BlockSuite 直接相关的样式/portal/theme 问题归入下一节 blocksuite。

## 2) blocksuite（含 blocksuite 相关 chat 组件）

### 发现的问题（按优先级）
- ✅ 已修复：业务页不再静态引入 `app/components/chat/infra/blocksuite/playground/style.css`，改为按需加载 `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css`（仍需继续关注 `:root/body` 级别副作用的长期隔离策略）。
- P1：`MutationObserver` 用于主题/portal 同步（`blocksuiteDescriptionEditor.tsx` 2 处）——逻辑合理但需要严格的挂载/卸载与触发频率控制，否则会造成性能抖动与隐藏的 event-loop 压力。
- P1：全局事件监听的注入策略需要更可控：`createEmbeddedAffineEditor.ts` 对 `document` 添加捕获监听（用于 slash menu selection guard），目前通过 once-guard 限制重复，但“不可卸载 + 全局捕获”在复杂页面上仍有潜在副作用。
- P2：仍存在 TODO（如 link preview endpoint 的 no-op override），需要补齐真正的后端能力或明确产品策略（禁用/自建/白名单）。

### 修复建议（面向你明天落地）
- 样式隔离最短路径（建议优先落地）：把 `@toeverything/theme` 与 `katex` 改为“仅在 blocksuite 挂载时注入”，并将 `:root/body` 级规则改为挂到 blocksuite scope（viewport 容器 + `.blocksuite-portal`）上。
- 性能与副作用控制：为 `MutationObserver` 增加节流/去抖与最小 diff（只在 `data-theme/class` 真变更时执行），并确保所有 observer 在卸载时 disconnect（当前已有，但建议再审一次边界）。
- 全局监听最小化：将 slash-menu selection guard 的启用条件收敛到 blocksuite 激活期间；如果必须全局捕获，至少在最后一个 editor 卸载时移除监听（引用计数）。

## 3) profile

### 发现的问题（按优先级）
- P2：少量“仅 console 错误输出但无用户反馈”的路径：例如保存个人资料/保存 GNS 偏好失败时只 `console.error`；用户侧可能只看到“没反应”。
- P2：存在 TODO 未收口（`GNSSpiderChart.tsx`：缺少错误提示）。
- P3：命名一致性问题：`workTabPart/moudleList.tsx`（疑似拼写）会降低可维护性与搜索效率（属于重构项）。

### 修复建议
- 错误处理统一：将 `console.error` 替换为统一的 toast/notification，并在失败时提供“重试/回退”动作；同时保留可观测性（logger 上报 + 关键字段脱敏）。
- TanStack Query 协议化：保存成功后统一 `invalidateQueries` 或乐观更新；失败时回滚本地 state，避免 UI 状态与服务端不一致。
- 命名重构：集中一次性修复拼写与路径命名（配合 IDE 重命名 + 路径别名校验），避免后续继续扩散。

## 4) role（`app/components/Role`）

### 发现的问题（按优先级）
- P1：控制台输出密度较高，明显集中在头像/立绘裁剪与编辑链路（例如 `sprite/Tabs/SpriteCropper.tsx`、`sprite/hooks/*`、`sprite/worker/*`），属于典型“开发期调试残留”信号；会影响性能与生产可观测性噪音。
- P1：与文件/图片处理相关的资源生命周期需要重点核查：存在 `URL.createObjectURL` 与 web worker（`useImageCropWorker.ts` / `imageCrop.worker.ts`），当前虽有部分 `URL.revokeObjectURL` 与 worker `terminate()`，但覆盖面不明显（建议逐一核对所有创建点是否都能在失败/取消/卸载路径释放）。
- P2：存在少量 `eslint-disable`（`SpriteCropper.tsx`、`Sidebar.tsx`、`rules/FormulaParser.ts`），需要确认是否是“绕过类型/依赖问题”还是“临时压制规则”。
- P2：计时器/动画相关调用存在一定数量（约 16 处），建议确认每处是否有 cleanup，避免裁剪/预览类组件频繁挂载导致重复执行。

### 修复建议
- 日志收敛：将 Role/Sprite 相关 `console.*` 全部替换为统一 logger，并按 `DEV/PROD` 分级（生产只保留 warn/error 且采样）；对用户可见失败要走 toast/弹窗提示而不是仅 console。
- 资源释放清单化：对“图片裁剪/预览”链路建立 checklist：`objectURL`、`worker`、`event listener`、`canvas`、`AbortController`；把释放动作统一放在 `useEffect` cleanup 与“取消/关闭弹窗”动作里。
- 规则禁用治理：每个 `eslint-disable` 都要落一个“为什么不能修”的短说明或直接用更小范围的替代（例如只禁用单行、或改为类型收窄/显式依赖）。

## 5) topbanner（`app/components/topbanner`）

### 发现的问题（按优先级）
- P2：存在 `window.location.reload()`（`Topbanner.tsx`）——在 SPA 中属于“重锤”，容易导致状态丢失、闪屏、以及与缓存/离线数据不一致；通常可以用状态刷新（query invalidation）替代。
- P2：存在“可点击但语义不规范”的写法（例如 `<a onClick=...>` 这类无 href 的交互），可访问性与键盘操作体验会受影响。
- P3：菜单开关逻辑包含多处事件监听（mousedown/touchstart）与 onBlur 关闭策略，建议复核在移动端/可聚焦元素嵌套时是否会出现“误关闭/无法关闭”的边界。

### 修复建议
- 刷新策略：将 `reload` 替换为 query 级刷新（如 TanStack Query `invalidateQueries`）或路由级 replace，保留必要的全局重置入口但避免默认使用。
- 可访问性：把无 href 的 `<a>` 改为 `<button type=\"button\">`，并补齐 aria-label/键盘触发；dropdown 建议使用更标准的 focus management（或引入成熟的 Headless 组件）。

## 6) common（`app/components/common`）

### 发现的问题（按优先级）
- P1：`quillEditor` 相关模块存在较多 `console.*`（例如 `quillEditor.tsx`、`utils/logger.ts`），以及较多与 `localStorage`/持久化选择区相关的逻辑；这类“编辑器 + 状态持久化”组合最容易出现：键冲突、数据膨胀、跨版本不兼容、以及生产环境噪音日志。
- P1：Markdown 渲染存在 raw HTML 路径（`markDownViewer.tsx` 使用 `rehype-raw` + `rehype-sanitize`），且内置了媒体 iframe 嵌入并开放 `sandbox` 多项权限（`allow-scripts` 等）——属于“可控但必须明确边界”的安全面。
- P2：存在少量 TODO（集中在 dicer/卡片组件），表明某些解析/展示能力处于未完成或临时状态。
- P2：存在不少 `eslint-disable`，其中 `dicer/cmdType.d.ts` 密度较高；这通常意味着类型定义/生成物与 lint 规则不匹配（建议隔离处理，不要影响业务文件的 lint 信号）。
- P3：文档/示例中出现 `eval(...)`（位于 dicer 的编程文档 markdown），建议显著标注“示例勿用于生产”或改为安全替代，避免被误抄到运行时代码。

### 修复建议
- Quill 编辑器体系化：把“日志/调试”与“生产逻辑”彻底分层（logger 在 PROD 默认静默或采样上报）；localStorage 统一 key/版本与容量上限；对持久化选择区/草稿增加迁移与清理策略。
- Markdown/嵌入安全：为 `rehype-sanitize` 明确 schema（允许标签/属性白名单）；对 iframe 嵌入做域名白名单（bilibili/youtube/pdf）与 URL 规范化；如允许脚本，至少限制来源与 referrerPolicy。
- TODO 收口：dicer/卡片组件的 TODO 建议转为 issue/任务并明确验收标准；对解析器建议补最小测试（命令样例集）。
- lint 隔离：对 `*.d.ts` 或生成物单独设置 eslint overrides（降级或忽略），避免迫使业务文件用 `eslint-disable` 自救。

## 7) webGAL（`app/webGAL`）

### 发现的问题（按优先级）
- P1：控制台输出非常密集（主要集中在 `realtimeRenderer.ts` 与 `useRealtimeRender.ts`），其中大量为状态流转/重试/队列等过程日志；生产环境容易造成噪音与性能开销，同时也会掩盖真正的错误信号。
- P1：WebSocket 连接与重连逻辑依赖环境变量（`VITE_TERRE_URL`/`VITE_TERRE_WS`），当前缺少“统一的启动前校验 + 用户侧可理解的错误呈现”（现在更多是 console + status change）。
- P2：存在规则禁用：
  - `chatRenderer.ts` 禁用了正则回溯风险规则（需要确认该正则对输入规模有上限或已做防护）。
  - `sceneEditor.ts` 禁用了 import 排序（通常意味着文件在持续变动或存在循环依赖压力）。
- P2：存在少量计时器（2 处），需要确认 cleanup 与重连次数上限配合，避免断线后产生并发重连或定时器叠加。

### 修复建议
- 日志/观测：把 WebGAL 的过程性日志迁移到统一 logger，并做分级（DEV 详细、PROD 采样/聚合）；只保留必要的错误码与关键上下文（脱敏）。
- 配置与降级：在 WebGAL 启动入口统一校验 env，并在 UI 上明确提示“未配置/不可用/如何配置”；同时提供降级路径（不启用实时渲染或仅本地预览）。
- 正则安全：对被禁用规则对应的正则增加输入长度限制/预编译/更安全的表达式，避免潜在 ReDoS 风险（尤其当输入来自用户或网络）。
- 重连治理：对重连采用指数退避 + 上限 + 状态机（connected/connecting/disconnected/error），并确保所有 timer/WS handler 在切换场景/卸载时释放。

## 8) tts（`app/tts`）

### 发现的问题（按优先级）
- P1：存在少量 `console.error`（主要在 `engines/gptSovits/api.ts` 与 `strategy/ttsEngines.ts`），建议统一到 logger + 用户提示，避免生产环境“只有控制台有信息”。
- P1：TTS 服务地址来自 `import.meta.env.VITE_TTS_URL`（默认 `http://localhost:9000`），需要统一的“启动前校验 + UI 反馈 + 降级策略”（未配置/不可用时如何表现）。
- P2：`gptSovits/api.ts` 使用 `localStorage` 保存配置：需要明确 key 命名空间、版本、以及“绝不保存敏感信息”的约束；同时要处理 JSON parse/写入失败等异常。
- P3：TTS 文档示例包含 `console.log` 与 base64 音频的使用方式，建议明确“生产用法”与“调试用法”，避免误用导致内存压力（长 base64 常驻内存）。

### 修复建议
- 配置治理：把 `VITE_TTS_URL`/引擎配置集中到一处（例如 `ttsConfig`），启动时做校验（URL 合法性、连通性可选），并在 UI 上提示当前引擎状态。
- localStorage 安全封装：统一 `saveConfig/loadConfig`（try/catch + schema + 默认值），key 采用 `tc:tts:*` 命名；明确禁止保存 token/用户隐私数据。
- 音频内存：优先用 `Blob`/流式返回替代长 base64；若必须 base64，确保及时释放引用（组件卸载/切换引擎/重试时）。

---

# 扩展扫描（按“之后你随便”继续）

## 9) app/utils

### 发现的问题（按优先级）
- P2：存在一定数量的 `console.*`（集中在 `PerformanceMonitor.ts`、`getThemeColor.ts`、`roleRuleStorage.ts`、`UploadUtils.ts` 等），建议把“性能/诊断”与“业务输出”分层，生产环境默认静默或采样上报。
- P2：存在少量环境变量读取（`app/utils/auth/authapi.ts`），需要统一 env 配置入口（避免散落导致测试/部署困难）。
- P2：网络请求工具使用分散（`fetch/AbortController` 出现在若干 util 中），建议统一封装（超时、取消、重试、错误标准化）。
- P2：存在一定数量的本地存储使用（`authapi.ts`、`roleRuleStorage.ts`），需要统一 key/版本与异常处理。

### 修复建议
- utils 分层：把“纯函数工具”和“有副作用工具（网络/存储/日志）”分目录；对副作用工具统一入口与依赖注入（便于测试与替换）。
- 请求/存储统一：提供 `request` 与 `storage` 的基础设施层，避免每个 util 各自 try/catch 与格式不一致。

## 10) api（`/api` OpenAPI 客户端 + hooks）

### 发现的问题（按优先级）
- P1：`eslint-disable` 数量非常高（大量集中在 `api/core/*` 与 `api/models/*`），这通常意味着“生成代码/第三方代码”与 lint 规则不匹配；继续在这些文件内修 lint 意义不大，反而会让业务 lint 信号失真。
- P1：存在较多 `console.*`（例如 `api/useWebSocket.tsx`、`api/instance.ts`、若干 hooks），建议统一到 logger，并把“连接状态/重试”类日志从默认 console 移除。
- P2：存在少量 `import.meta.env` 使用点（`api/instance.ts`、`api/useWebSocket.tsx`），建议统一封装 baseURL/wsURL（支持不同环境与运行时注入）。
- P2：存在授权/令牌相关字符串匹配痕迹（`api/tuanchat_OpenAPI.json`、`api/core/request.ts`），需要确认 token 注入/刷新策略是否集中、是否有泄漏到日志的风险。

### 修复建议
- 生成代码隔离：对 `api/core/**`、`api/models/**` 做 eslint ignore 或单独 overrides（只保留最关键规则），把 lint 资源集中在 hooks/业务封装层。
- auth 策略集中：统一 token 的注入/刷新/退出逻辑（避免在多个 hooks/instance 分散实现）；确保不会把 token 打进日志。

## 11) app/routes

### 发现的问题（按优先级）
- P2：routes 内 `console.*` 较少，属于好现象；目前主要出现在 blocksuite playground/文档测试相关路由（`blocksuitePlayground.tsx`、`docTest.tsx`）。
- P2：未发现明显 `dangerouslySetInnerHTML`/`rehype-raw` 使用点（当前扫描结果为 0）。

### 修复建议
- 测试/演示路由隔离：对 playground/doc-test 路由添加显式“仅开发环境可用”保护（构建时剔除或权限控制），避免生产暴露。

## 12) electron（`/electron`）

### 发现的问题（按优先级）
- P1：存在子进程启动（`spawn`）用于 WebGAL（`electron/main.js`），需要重点审计：可执行路径来源、参数拼接、工作目录、以及异常退出时的回收策略（避免僵尸进程）。
- P1：`BrowserWindow` 的 `contextIsolation` 已启用（是正向项）；仍建议复核 preload 暴露的 API 边界与 IPC 白名单，避免渲染进程拿到过多系统权限。
- P2：存在一定数量 `console.*`（`electron/main.js`），建议生产环境改为文件日志/上报并分级。

### 修复建议
- 进程安全：明确 webgalPath 的来源必须是受信目录；参数必须严格白名单；为 spawn 增加超时/退出处理，并在 app quit 时保证 kill。
- IPC 安全：preload 仅暴露最小 API；所有 IPC 采用 channel 白名单与参数校验；禁用任意消息透传到 shell/fs。

## 13) scripts/config（`vite.config.ts` / `eslint.config.mjs` / `scripts/*`）

### 发现的问题（按优先级）
- P1：`vite.config.ts` 含多项“为 blocksuite/上游依赖兜底”的构建修复（CJS default export 修复、blocksuite auto-accessor downlevel、SSR `noExternal`、optimizeDeps include/exclude、vanilla-extract transform 模式等）。这些改动本质上是“兼容层”，需要防止在后续依赖升级时变成隐藏故障源。
- P2：`eslint.config.mjs` 当前对 `node/no-process-env` 很严格，但代码里仍存在少量 `process.env`/`import.meta.env` 使用；建议统一规范“只允许集中配置入口读取 env”。

### 修复建议
- 兼容层可维护性：为 `vite.config.ts` 中每个 workaround 建立“触发条件/上游版本/可移除条件”的小节（文档化即可），避免半年后无人知道为什么存在。
- env 规范化：统一使用 `VITE_*` 并集中读取；禁止业务文件直接读 env（避免 SSR/测试差异）。
