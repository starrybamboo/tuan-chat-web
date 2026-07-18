# 团剧共创前端

团剧共创前端仓库包含 Web、Electron 桌面端和 Expo 移动端。Web 端以 React、TanStack Router、React Query、Tailwind CSS v4 为主；桌面端通过 Electron 打包；移动端位于 `apps/mobile`，通过 pnpm workspace 复用共享包。

## 版本策略

- 产品版本从 `0.1.0.0` 开始；每次迭代递增最后一位，例如 `0.1.0.1`。
- npm workspace、Electron 等需要 SemVer 的 `package.json` 版本只记录前三段，例如 `0.1.0`。
- Android 安装包使用四段 `versionName`，同时每次迭代递增 `versionCode`，保证设备可以覆盖安装。
- EAS 正式构建（`production`、`production-apk`）启用 `autoIncrement`，每次正式打包自动递增原生构建号。

## 环境要求

- Node.js 22 或更高版本
- pnpm 11.7.0（以 `packageManager` 为准，建议通过 Corepack 启用）
- 本地开发默认需要 TuanChat 后端运行在 `http://localhost:8081`，WebSocket 运行在 `ws://localhost:8090`
- Electron 打包如需携带 WebGAL_Terre，需要准备 `WebGAL_Terre` release 目录

安装依赖：

```bash
pnpm install
```

## 常用命令

```bash
pnpm dev
pnpm dev:force
pnpm build
pnpm start
pnpm test
pnpm test:coverage
pnpm lint
pnpm lint:fix
pnpm lint:all
pnpm typecheck
pnpm typecheck:all
pnpm encoding:check
pnpm openapi
pnpm openapi:sync
```

- `pnpm dev`：以 `dev` mode 启动 Vite 开发服务，默认端口 `5177`，并自动打开浏览器。
- `pnpm dev:force`：清理隔离的 Vite optimize deps 缓存后启动开发服务。
- `pnpm build`：构建 Web 产物。
- `pnpm start`：服务化运行已构建产物；运行前需要先 `pnpm build`。
- `pnpm test`：运行 Web 端 Vitest 单元测试。
- `pnpm test:coverage`：运行同一组 Web Vitest 测试并启用 V8 覆盖率阈值，当前阈值为行、分支、函数、语句各 70%。
- `pnpm lint` / `pnpm typecheck`：默认覆盖 repo、Web 与桌面端；需要连同移动端一起验收时使用 `pnpm lint:all` / `pnpm typecheck:all`。
- `pnpm openapi`：从 `packages/tuanchat-openapi-client/tuanchat_OpenAPI.json` 重新生成 OpenAPI client，并执行结果守卫补丁。
- `pnpm openapi:sync`：从当前运行的 TuanChat 后端读取 live OpenAPI，刷新两份规范快照并重新生成 client；后端默认地址为 `http://127.0.0.1:8081`，可通过 `TUANCHAT_OPENAPI_URL` 覆盖规范地址。

移动端常用入口：

```bash
pnpm mobile:start
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:web
pnpm mobile:typecheck
pnpm mobile:local-apk
pnpm mobile:debug-apk
pnpm mobile:cloud-apk
pnpm mobile:workflow:preview
pnpm mobile:workflow:production
pnpm mobile:ios:credentials
pnpm mobile:ios:bootstrap-production
```

- `pnpm mobile:start`：启动 Expo 开发服务器，终端会显示二维码。
- `pnpm mobile:android`：启动 Expo 开发服务器并尝试唤起 Android。
- `pnpm mobile:local-apk`：在本机生成连接生产 API / WebSocket 的 Release APK。
- `pnpm mobile:debug-apk`：为本地后端调试链构建、安装并启动 Debug APK，默认使用 x86_64 架构。
- 其余 `mobile:*` 为本地打包、发版和云端 EAS 相关入口。

## 环境变量

仓库提供三个模式文件：

- `.env.dev`：本地开发，默认 `VITE_API_BASE_URL=http://localhost:8081`、`VITE_API_WS_URL=ws://localhost:8090`。
- `.env.test`：测试环境构建，默认直连 `https://api.tuan.chat/api`、`wss://api.tuan.chat/ws`。
- `.env.production`：生产环境构建，默认直连 `https://api.tuan.chat/api`、`wss://api.tuan.chat/ws`。

本机私有覆盖请使用 `.env.dev.local`、`.env.local` 等已被 gitignore 忽略的文件。不要提交账号、密码、token 或其他敏感配置。

固定约定：

```plain text
VITE_TERRE_URL=http://localhost:3001
VITE_TERRE_WS=ws://localhost:3001/api/webgalsync
```

除非明确需要调整 WebGAL_Terre 联动地址，否则不要修改这两个变量。

## OpenAPI 与共享包

- `packages/tuanchat-openapi-client`：生成的 TuanChat OpenAPI client、模型和基础 request 逻辑。
- `api/`：Web 端 API 实例、认证请求封装、React Query hooks、WebSocket 入口和 NovelAI client。
- `packages/tuanchat-query`：可在 Web / Mobile 之间复用的查询和缓存更新逻辑。
- `packages/tuanchat-domain`：纯业务规则、消息草稿、消息类型、状态指令、骰子等可复用领域逻辑。
- `packages/tuanchat-local-db`：本地数据库相关共享逻辑。

后端接口变化后，先启动对应版本的后端，再运行：

```bash
pnpm openapi:sync
```

该命令会同步 `packages/tuanchat-openapi-client/tuanchat_OpenAPI.json` 与 `apps/web/api/tuanchat_OpenAPI.json`，然后生成 `packages/tuanchat-openapi-client/src`。后端不可达时应直接排查连接，不要用旧快照冒充同步成功。只有规范快照已从可信后端刷新、仅需重新生成 client 时，才单独运行 `pnpm openapi`。

不要手改生成产物来绕过类型或接口问题。调用 TuanChat 后端时优先使用生成客户端或 `apps/web/api` 中现有的 hook/service；文件上传、流式响应及生成客户端无法表达的请求可以保留直接调用，但需要明确鉴权、响应解包、取消和缓存边界。

## Electron

开发：

```bash
pnpm desktop:dev
```

打包：

```bash
pnpm desktop:build
pnpm desktop:build:win:zip
pnpm desktop:build:win:nsis
pnpm desktop:build:mac:zip
pnpm desktop:build:mac:dmg
```

`electron:*` 命令仍作为兼容别名保留；新增说明和日常使用优先采用 `desktop:*` 命名。

Electron 打包前会运行：

```bash
pnpm desktop:check:webgal
```

默认本地打包会先运行 `pnpm desktop:prepare:webgal`，链式构建 `D:\A_collection\WebGAL`、`D:\A_collection\WebGAL_Terre`，并把 Terre 运行时输出到 `D:\A_collection\WebGAL_Terre\release\tuanchat-runtime`。随后 `pnpm desktop:check:webgal` 只校验该发行目录，不再复制到项目内的中转目录；如果需要使用其他发行目录，可设置 `WEBGAL_TERRE_RELEASE_DIR`。electron-builder 会按白名单把发行目录中的 `WebGAL_Terre.exe`、`assets`、`lib`、`public` 打进 `resources/webgal-terre`，并排除 `public/games` 等本地用户内容。本地 Electron 产物默认覆盖输出到 `D:\A_collection\tuan-chat-web\release_local_latest`。

Windows 下 electron-builder 首次下载 `nsis` / `winCodeSign` 可能受网络影响。可先构建 zip，再单独构建 nsis；必要时设置 `ELECTRON_BUILDER_CACHE` 或 `ELECTRON_BUILDER_BINARIES_MIRROR`。

若 Windows 打包报错 `app.asar is being used by another process`，先用 `Get-CimInstance Win32_Process` 根据 `ExecutablePath` 与 `CommandLine` 找出确实引用本次输出目录的进程，只停止确认持锁的 PID，不要按进程名批量结束 Electron、WebGAL 或团剧共创进程。若 runtime 准备、校验与 `build:app` 已成功，可为 electron-builder 指定 `--config.directories.output=release_local_latest/<unique-tag>` 后单独重试，避免反复覆盖被占用的目录。

交付 Windows 包前至少核对 zip 或 Setup 的路径、大小和修改时间，并确认 unpacked 目录包含 `resources/webgal-terre`、Terre 可执行文件、`assets`、`lib` 与 `public`；包内不得带入 `public/games`、`Exported_Games` 等本地用户作品。启动产物后还应确认内置 Terre 可以拉起，并会在桌面应用退出后清理子进程。

## CI/CD

Web 部署：

- Cloudflare Pages Git 集成负责自动部署；`tuan-chat-web` 连接 `main` 分支并对应 `https://tuan.chat/`，`tuan-chat-web-test` 连接 `dev` 分支并对应 `https://test.tuan.chat/`。
- 两个 Pages 项目都使用构建命令 `pnpm run build`，输出目录 `dist`。
- 构建脚本会在 Cloudflare Pages 环境中按分支自动选择模式：`main` 使用 `.env.production`，`dev` 使用 `.env.test`。
- API、WebSocket、TTS 与媒体域名由 `.env.production` / `.env.test` 显式配置为直连地址；Cloudflare Pages 控制台或手动部署 workflow 中的同名变量会覆盖仓库文件。
- `.github/workflows/cd.yaml` 是 Cloudflare Pages 手动兜底部署入口。
- `deploy_env=test` 会使用 `tuan-chat-web-test` 项目和 `test` mode。
- `deploy_env=production` 会使用 `tuan-chat-web` 项目和 `production` mode。
- `deploy_env=auto` 按实际 `source_ref` 推导环境，只接受 `dev` 或 `main`；标签、commit 或其他分支必须显式选择环境。
- 构建产物目录为 `dist`，手动兜底流程使用不带 `--branch` 的 `wrangler pages deploy dist`，直接更新所选 Pages 项目的生产环境。
- 线上 Web 运行时使用环境变量中的直连域名访问 API、WebSocket、TTS 与媒体资源，不再把主流量打到 Pages Functions。
- 短连接 REST/API 的 QUIC 升级落在 Cloudflare 边缘层：公网 `tuan.chat`、`test.tuan.chat`、`api.tuan.chat` 等域名由 Cloudflare 返回 `alt-svc: h3=":443"`；源站 `24.233.10.150` 仍由 Nginx 1.24 在 80 端口反代到后端，源站 443 当前不开放。
- Pages Functions 仅作为旧同源路径和特殊路径兜底：`public/_routes.json` 限定只有 `/api`、`/ws`、`/tts`、`/terre`、`/media`、`/avatar`、`/updates` 会触发 Functions；静态资源和 SPA fallback 保持 Pages 静态托管。

## 目录结构

```plain text
apps/web/app/                Web 端 React 应用
apps/web/app/routes/         TanStack Router 文件路由
apps/web/app/components/     页面组件和业务组件
apps/web/app/utils/          Web 端工具函数
apps/web/app/webGAL/         WebGAL 联动与渲染
apps/web/api/                Web 端 API 实例、hooks、WebSocket
apps/web/functions/          Cloudflare Pages Functions 兜底入口
apps/mobile/                 Expo 移动端
apps/desktop/                Electron 桌面端 workspace app
packages/                    workspace 共享包
scripts/                     仓库级开发、生成、导入脚本
```

## 开发约定

- 新增或修改测试文件后，按影响范围运行对应 Vitest 或 package 测试；不要因为局部测试改动默认扩大到全量。
- 修改 Web / 桌面端 / 根配置后，优先运行相关 Vitest 目标、相关 `lint` / `typecheck` 或更小范围的验收；只有改动触及共享基础逻辑、构建配置、跨模块契约，或明确要求完整验收时，才运行 `pnpm test`、`pnpm lint`、`pnpm typecheck` 全量组合。
- 修改移动端代码时，优先运行 `pnpm lint:mobile`、`pnpm typecheck:mobile` 或受影响共享逻辑的对应测试；需要覆盖所有端时再使用 `pnpm lint:all` / `pnpm typecheck:all`。
- 仅修改文档时至少运行 `pnpm encoding:check`。
- 新增 API hook 前先搜索 `api/hooks/**` 和 `packages/tuanchat-query/**`，避免重复封装。
- mutation 成功后要按现有模式 invalidate 或更新对应 query cache。
- 图标优先使用 `@phosphor-icons/react`；移动端使用 `phosphor-react-native`。
- UI 样式使用 Tailwind CSS v4；输入框样式不要直接套 daisyUI input。

## 参考资料

自 2026-04-18 起，团剧共创使用的 Blocksuite 参考仓库统一迁移到：

- `D:\A_blocksuite\AFFiNE`
- `D:\A_blocksuite\OctoBase`

详细说明见 `docs/integrations/blocksuite.md` 和 `docs/vendors/blocksuite/index.md`。

更细的代理协作规则见 `AGENTS.md`。
