# AGENTS.md

## 项目概览

- `tuan-chat-web` 是团剧共创前端主仓库，包含 Web、Electron、移动端、共享包与 WebGAL/Terre 联动代码。
- 修改本仓库时同时遵守 `D:\A_collection\AGENTS.md` 的工作区通用规则。
- Web 端当前位于 `apps/web`，移动端位于 `apps/mobile`，共享包位于 `packages`；不要沿用旧 prompt 中以根 `app/` 作为唯一源码根的判断。
- Web 路由使用 TanStack Router 与 `apps/web/app/routeTree.gen.ts` 生成路由树；不要按旧 React Router 7 / `app/routes.ts` 规则新增路由。

## 任务完成要求

- 在任务被视为完成前，必须根据本轮实际修改范围运行对应验收命令，并在答复中说明结果。
- 不要随意运行全量测试；开发或修复功能后，优先运行受影响模块、文件或功能域的定向测试，并说明覆盖范围。
- 修改 Web / Electron / 根应用代码（含 `app`、`api`、`electron`、根构建配置）时，优先运行相关 Vitest 目标、相关 lint/typecheck 命令或更小范围验收；只有改动触及共享基础逻辑、构建配置、跨模块契约，或用户明确要求完整验收时，才运行 `pnpm test`、`pnpm lint`、`pnpm typecheck` 全量组合。
- 修改移动端代码（`apps/mobile`）时，优先运行受影响范围的 mobile lint/typecheck/test；如改动影响共享业务逻辑或测试覆盖范围，还需补充对应 Vitest 目标，必要时再扩大到 `pnpm test`。
- 修改共享包（`packages` 下非生成代码）时，运行受影响包相关测试；若共享逻辑会影响 Web 或移动端调用方，还需补充对应端的 lint/typecheck/test 命令。
- 仅修改文档、说明或不会影响运行时的配置时，运行与文件类型对应的轻量验收命令；文本文件至少运行编码或格式相关检查。
- 如果对应验收命令因既有无关问题失败，必须在答复中明确失败命令、失败位置，以及是否与本轮修改相关。
- 常用入口以根 `package.json` 为准：Web 可用 `pnpm dev` / `pnpm web:dev`、`pnpm lint:web`、`pnpm typecheck:web`、`pnpm test`；移动端可用 `pnpm mobile:start`、`pnpm lint:mobile`、`pnpm typecheck:mobile`；Electron 可用 `pnpm electron:dev`、`pnpm electron:build`。
- `pnpm electron:build` 默认会链式构建本地 `D:\A_collection\WebGAL` 与 `D:\A_collection\WebGAL_Terre`；仅在明确需要复用已有 Terre release 时，才设置 `WEBGAL_TERRE_RELEASE_DIR`。

## 工作原则

- 长期可维护性优先于局部省事。
- 新增功能前先看能否抽出可复用的共享逻辑。
- 避免在多个文件重复实现同一逻辑。
- 不要为了赶进度在局部补丁式绕过问题，优先修正根因。
- 尽量失败即停，不写不必要的回退逻辑；确需回退时，应说明触发条件和用户可见效果。
- 业务层不要吞错；让异常尽早冒泡，必要时只在边界层处理。
- 优先直接调用所属模块或服务，不要无意义地加一层抽象。

## 编码约定

- 需要对外暴露的类型、接口、函数、类要补充注释；关键分支逻辑也要有功能性注释。
- 写代码时优先复用现有公共组件和工具函数；如果公共逻辑明显可复用，先抽到 common/util 再使用。
- 不要创建本地重复类型，也不要为了绕过 TypeScript 问题把类型强转成临时替身类型。
- 尽量不要手写显式返回类型，除非 TypeScript 推断不稳或公共契约需要。
- 单元测试要严格镜像源码目录结构，每个测试文件只测试对应源文件的行为。
- 测试要能证明问题真实存在；不要只写“会通过但证明不了什么”的测试。
- Web 端环境变量读取使用 `import.meta.env`；移动端 Expo 代码使用 `process.env.EXPO_PUBLIC_*`。不要把旧前端 prompt 的 `process.env` 禁令套到 `apps/mobile`。

## React 与状态管理

- 避免 React 最大更新深度和 `useSyncExternalStore` 循环；在 `useEffect` 写回状态前先做相等性判断。
- 对对象和数组比较时，优先按 id、长度或关键字段判断，避免每次渲染都触发 `setState`。
- 避免 Zustand 选择器返回新对象；需要组合字段时用 `shallow`，或拆成多个选择器。
- store 的 set 和更新函数在没有变化时应返回旧 state 或 prev，避免订阅者反复触发更新。
- `useSearchParamsState` 的 `defaultValue` 必须是稳定引用；默认值会变化时传 `shortenUrl=false`，避免 URL 和默认值来回写。
- 新增 React Query hook 前先全局搜索既有 hook、query key 与 selector；mutation 成功后按既有 query key 失效对应缓存，避免维护第二份业务真相。

## 目录与生成代码

- `apps/web/app` 是 Web 业务源码根；页面、组件、hooks、工具函数应按现有模块归属放置，不要新建平行的 `src2`、`V2` 或重复目录。
- `apps/web/api` 与 `packages/tuanchat-openapi-client` 包含 OpenAPI 产物；不要手改生成代码。接口变化应先更新后端 OpenAPI 或 OpenAPI JSON，再运行 `pnpm openapi`。
- `packages` 下共享逻辑要保持端无关；引入 Web、Electron、Expo 或 DOM 专属依赖前，先确认调用方边界。

## 媒体图片展示

- 展示内部媒体图片资源时，业务数据应以 `fileId` / `source.kind === "internal"` 为准，通过 `mediaFileUrl`、`imageLowUrl`、`imageMediumUrl` 或 `resolveMessageMediaUrl` 构造目标 quality 的展示地址，不要假设后端会直接返回最终图片 URL。
- 由内部媒体 `fileId` 构造出的图片展示地址，应优先交给 `@/components/common/mediaImage` 的 `MediaImage` 渲染，以复用派生图缺失时回退 original、本地派生状态缓存和加载兜底逻辑。
- 只有外部图片 URL（`source.kind === "external"`）、本地临时预览、`dataUrl`、`blobUrl`、canvas/裁剪/AI 生成中间态、静态资源等非内部媒体派生图场景，才直接使用原生 `<img>` 或对应场景组件。

## UI 与前端约束

- 前端页面不要产生对功能进行叙述的文字。
- 输入框样式不要使用 daisy UI，优先使用 `transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary`。
- 默认圆角使用 `rounded-md`。
- 需要图标时使用 Phosphor Icons，并优先复用现有图标体系。
- 常见、低歧义 UI 操作优先使用通用图标表达，例如展开/折叠、关闭、删除、返回、搜索、设置。
- 图标按钮必须补齐 `title`/`aria-label` 等可访问说明；仅在语义不够直观、风险较高或首次引导时，再同时保留文字标签。
- 使用 Tailwind CSS v4 的样式类。

## 移动端本地联调

- 排查移动端登录、聊天、WebSocket、首条消息发送或跨端推送问题时，优先让 Web 与移动端共同连接本地 `TuanChat` 后端，避开线上人机校验和生产网络变量。
- Android 本地后端联调使用 `adb reverse`：先执行 `D:\AndroidSdk\platform-tools\adb.exe reverse tcp:8081 tcp:8081`，需要本地 WebSocket 时再执行 `D:\AndroidSdk\platform-tools\adb.exe reverse tcp:8090 tcp:8090`。
- 移动端 Expo 环境变量使用 `EXPO_PUBLIC_TUANCHAT_API_BASE_URL=http://127.0.0.1:8081` 与 `EXPO_PUBLIC_TUANCHAT_API_WS_URL=ws://127.0.0.1:8090`；这里的 `127.0.0.1` 是设备侧 localhost，由 `adb reverse` 转发到电脑本机。
- 只有验证线上环境特有行为、线上账号权限或生产网关问题时，才把移动端切回 `https://api.tuan.chat/api` / `wss://api.tuan.chat/ws`。

## 文档要求

- 项目文档必须使用中文书写，术语、命令、路径、环境变量、协议名和代码标识可保留英文。
- 新增或修改项目文档时，应将非术语性的英文内容翻译成中文，避免中英文随意混写。
- 如果实现变更改变长期判断、能力边界、跨端关系或 OpenSpec 行为，应同步更新 `tuanchat-docs`。

## 部署与运行

- 仅在用户明确要求 commit、push 或 deploy 时执行对应 Git/部署操作；不要在普通答复结束后自动 commit。
- Cloudflare Pages 部署优先使用官方 Wrangler 命令行，例如 `pnpm dlx wrangler@latest pages deploy dist --project-name <project> --branch <branch> --commit-dirty=true`；部署前可用 `pnpm dlx wrangler@latest whoami` 验证当前登录态。
- Wrangler 4.x 不提供 DNS 记录管理子命令，也没有 DNS 写入 OAuth scope；需要新增或修改 DNS 记录时，使用带 `Zone / DNS / Edit` 与 `Zone / Zone / Read` 权限的 Cloudflare API Token 调用 Cloudflare REST API，不要误以为当前 Wrangler 登录态可以改 DNS。

## WebGAL / Terre 联动

- 如果用户提到“团剧共创”与 WebGAL / Terre 联动、完整设置开关、角色发言聚焦、空间级 WebGAL 设置，先读 `docs/reference/webgal-tuanchat-index.md`。
- 如果修改了 WebGAL 引擎（含 `WebGAL/packages/webgal` 或 `WebGAL/packages/parser`），需同步构建并更新 Terre 预览引擎与模板。
- WebGAL / Terre 联动改造必须优先复用 WebGAL 原生机制，包括脚本命令、`setVar` 变量系统、资源目录、场景回放和已有 UI 渲染语义；只有原生机制无法表达需求时才允许扩展。
- WebGAL / Terre / 团剧共创联动的本地迭代不要求兼容历史版本或旧脚本语法；当新语法或新数据模型更清晰时，优先直接更新生成端、解析端和文档/测试，不为已废弃写法长期保留兼容分支。
- WebGAL 舞台不是普通响应式页面：运行时 `#root` 固定为 2560x1440 设计稿尺寸，再由 `index.html` 根据窗口/全屏状态对整个 root 做 `transform: scale(...)`。因此 WebGAL 引擎内覆盖层、战斗地图、骰子 UI、悬浮面板等应优先使用设计稿像素或相对 WebGAL root 的百分比布局，不要把 `vw` / `vh` 当作最终视觉尺寸。
- Terre 连接地址在所有环境统一固定为：`VITE_TERRE_URL=http://localhost:3001`、`VITE_TERRE_WS=ws://localhost:3001/api/webgalsync`；除非用户明确要求，否则禁止修改这两个变量，包括 `.env.development`、`.env.production`、`.env.test` 与 CI/CD 注入值。

## 其他约束

- `helloagent` 不要落文档知识库。
- 不要调用方案设计。
