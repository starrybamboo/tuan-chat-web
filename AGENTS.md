# AGENTS.md

## 项目概览

- `tuan-chat-web` 是团剧共创前端主仓库，包含 Web、Electron、移动端、共享包与 WebGAL/Terre 联动代码。
- 修改本仓库时同时遵守 `D:\A_collection\AGENTS.md` 的工作区通用规则。
- Web 端当前位于 `apps/web`，移动端位于 `apps/mobile`，共享包位于 `packages`；不要沿用旧 prompt 中以根 `app/` 作为唯一源码根的判断。
- Web 路由使用 TanStack Router 与 `apps/web/app/routeTree.gen.ts` 生成路由树；不要按旧 React Router 7 / `app/routes.ts` 规则新增路由。

## 任务完成要求

- 新增、修改、修复或评审本仓库测试时，使用工作区 skill `$tuanchat-frontend-test-guard`。
- 在任务被视为完成前，必须根据本轮实际修改范围运行对应验收命令，并在答复中说明结果。
- 测试验收遵循根 `D:\A_collection\AGENTS.md` 的“先定向、后扩大”规则；工具或技能提供的全量命令遵循同一范围判断。
- 修改 Web / Electron / 根应用代码（含 `app`、`api`、`electron`、根构建配置）时，先运行相关 Vitest 目标、相关 lint/typecheck 命令或更小范围验收；共享基础逻辑、构建配置、跨模块契约、发布流程或用户明确要求完整验收时，再运行 `pnpm test`、`pnpm lint`、`pnpm typecheck` 全量组合。
- 修改移动端代码（`apps/mobile`）时，先运行受影响范围的 mobile lint/typecheck/test；改动影响共享业务逻辑或测试覆盖范围时，再补充对应 Vitest 目标并按影响面扩大。
- 修改共享包（`packages` 下非生成代码）时，先运行受影响包相关测试；共享逻辑影响 Web 或移动端调用方时，再补充对应端的定向 lint/typecheck/test。
- 新增或修改测试时，先运行新增测试及直接相关测试；测试文件的变更本身不触发 `pnpm test` 全量执行。
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

- 编写、评审或重构本仓库 React 代码时，使用工作区 skill `$tuanchat-react-best-practices`；不要使用面向 Next.js、RSC 或 Server Actions 的 `build-web-apps:react-best-practices` / `vercel-react-best-practices`。
- 避免 React 最大更新深度和 `useSyncExternalStore` 循环；在 `useEffect` 写回状态前先做相等性判断。
- 对对象和数组比较时，优先按 id、长度或关键字段判断，避免每次渲染都触发 `setState`。
- 避免 Zustand 选择器返回新对象；需要组合字段时用 `shallow`，或拆成多个选择器。
- store 的 set 和更新函数在没有变化时应返回旧 state 或 prev，避免订阅者反复触发更新。
- `useSearchParamsState` 的 `defaultValue` 必须是稳定引用；默认值会变化时传 `shortenUrl=false`，避免 URL 和默认值来回写。
- 新增 React Query hook 前先全局搜索既有 hook、query key 与 selector；mutation 成功后按既有 query key 失效对应缓存，避免维护第二份业务真相。
- 新建或修改组件时，只要涉及服务端状态变更，就必须评估乐观更新；除非操作极其重要、失败风险较高，或乐观更新与可靠回滚明显难以实现，否则默认使用 React Query 缓存完成乐观更新、并发安全回滚和 settled 后校准。选择不做乐观更新时，应在相关代码或交付说明中明确原因。

## 目录与生成代码

- `apps/web/app` 是 Web 业务源码根；页面、组件、hooks、工具函数应按现有模块归属放置，不要新建平行的 `src2`、`V2` 或重复目录。
- `packages/tuanchat-openapi-client/src` 是 OpenAPI 生成代码，规范快照位于 `packages/tuanchat-openapi-client/tuanchat_OpenAPI.json` 与 `apps/web/api/tuanchat_OpenAPI.json`；不要手改生成代码。后端接口变化后运行 `pnpm openapi:sync` 从当前 live 后端同步两份快照并重新生成；仅在快照已可信更新时单独运行 `pnpm openapi`。
- 访问 TuanChat 后端时优先使用生成客户端或现有手写 hook/service。新增直接 `fetch` / `tuanchat.request.request` 前，先确认它属于文件上传、流式响应或生成客户端无法表达的调用，并核对鉴权、响应解包、取消与缓存语义；第三方 URL 和静态资源请求不受此限制。
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

- 命令名中的 `mobile:local-apk` 表示“在本机构建 APK”，该包固定连接生产 API / WebSocket；不要把它解释为本地后端联调入口。
- 本地后端调试链使用 `pnpm mobile:debug-apk` 安装 Debug APK，再配合 `pnpm mobile:start:local-backend` 启动 Metro 和本地后端环境变量。
- 排查移动端登录、聊天、WebSocket、首条消息发送或跨端推送问题时，优先让 Web 与移动端共同连接本地 `TuanChat` 后端，避开线上人机校验和生产网络变量。
- 默认模拟器调试链使用 `EXPO_PUBLIC_TUANCHAT_API_BASE_URL=http://10.0.2.2:8081` 与 `EXPO_PUBLIC_TUANCHAT_API_WS_URL=ws://10.0.2.2:8090`；`10.0.2.2` 是 Android 模拟器访问宿主机的固定网关。
- 真机调试才使用 `adb reverse` 与设备侧 `127.0.0.1`；API、WebSocket 和 Metro 分别按需反向转发 `8081`、`8090`、`8082`。
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
- Terre 连接地址在所有环境统一固定为：`VITE_TERRE_URL=http://localhost:3001`、`VITE_TERRE_WS=ws://localhost:3001/api/webgalsync`；除非用户明确要求，否则禁止修改这两个变量，包括 `.env.dev`、`.env.production`、`.env.test` 与 CI/CD 注入值。

## 其他约束

- `helloagent` 不要落文档知识库。
- 不要调用方案设计。
