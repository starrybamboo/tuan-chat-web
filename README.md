# 团剧共创前端

团剧共创前端仓库包含 Web、Electron 桌面端和 Expo 移动端。Web 端以 React、TanStack Router、React Query、Tailwind CSS v4 为主；桌面端通过 Electron 打包；移动端位于 `apps/mobile`，通过 pnpm workspace 复用共享包。

## 版本策略

- 产品版本从 `0.1.0.0` 开始；每次迭代递增最后一位，例如 `0.1.0.1`。
- npm workspace、Electron 等需要 SemVer 的 `package.json` 版本只记录前三段，例如 `0.1.0`。
- Android 安装包使用四段 `versionName`，同时每次迭代递增 `versionCode`，保证设备可以覆盖安装。

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
pnpm test:e2e
pnpm test:coverage
pnpm lint
pnpm lint:fix
pnpm lint:all
pnpm typecheck
pnpm typecheck:all
pnpm encoding:check
pnpm openapi
```

- `pnpm dev`：启动 Vite 开发服务，默认端口 `5177`，并自动打开浏览器。
- `pnpm dev:force`：清理隔离的 Vite optimize deps 缓存后启动开发服务。
- `pnpm build`：构建 Web 产物。
- `pnpm start`：服务化运行已构建产物；运行前需要先 `pnpm build`。
- `pnpm test`：运行 Web 端 `*.test.ts` Vitest 单元测试，不包含 `*.e2e.test.ts`。
- `pnpm test:coverage`：运行同一组 Web Vitest 测试并启用 V8 覆盖率阈值，当前阈值为行、分支、函数、语句各 70%。
- `pnpm test:e2e`：运行 `*.e2e.test.ts` 浏览器端测试。
- `pnpm lint` / `pnpm typecheck`：默认覆盖 repo、Web 与桌面端；需要连同移动端一起验收时使用 `pnpm lint:all` / `pnpm typecheck:all`。
- `pnpm openapi`：从 `packages/tuanchat-openapi-client/tuanchat_OpenAPI.json` 重新生成 OpenAPI client，并执行结果守卫补丁。

移动端常用入口：

```bash
pnpm mobile:start
pnpm mobile:android
pnpm mobile:ios
pnpm mobile:web
pnpm mobile:typecheck
pnpm mobile:local-apk
pnpm mobile:emulator-apk
pnpm mobile:cloud-apk
pnpm mobile:workflow:preview
pnpm mobile:workflow:production
pnpm mobile:ios:credentials
pnpm mobile:ios:bootstrap-production
```

- `pnpm mobile:start`：启动 Expo 开发服务器，终端会显示二维码。
- `pnpm mobile:android`：启动 Expo 开发服务器并尝试唤起 Android。
- `pnpm mobile:emulator-apk`：面向模拟器构建、安装并启动本地 APK，默认使用 x86_64 架构。
- 其余 `mobile:*` 为本地打包、发版和云端 EAS 相关入口。

## 环境变量

仓库提供三个模式文件：

- `.env.development`：本地开发，默认 `VITE_API_BASE_URL=http://localhost:8081`、`VITE_API_WS_URL=ws://localhost:8090`。
- `.env.test`：测试环境构建，默认直连 `https://api.tuan.chat/api`、`wss://api.tuan.chat/ws`。
- `.env.production`：生产环境构建，默认直连 `https://api.tuan.chat/api`、`wss://api.tuan.chat/ws`。

本机私有覆盖请使用 `.env.development.local`、`.env.local` 等已被 gitignore 忽略的文件。不要提交账号、密码、token 或其他敏感配置。

固定约定：

```plain text
VITE_TERRE_URL=http://localhost:3001
VITE_TERRE_WS=ws://localhost:3001/api/webgalsync
```

除非明确需要调整 WebGAL_Terre 联动地址，否则不要修改这两个变量。

## 自动测试登录态

需要跑依赖登录态的 Playwright、Codex Browser 或 Computer Use 测试时，不要反复走登录页 UI。先在本机 `.env.development.local` 配置测试账号：

```plain text
TC_E2E_USER_ID=10001
TC_E2E_PASSWORD=<本地测试账号密码>
TC_E2E_LOGIN_METHOD=userId
TC_E2E_API_BASE_URL=http://localhost:8081
TC_E2E_APP_ORIGIN=http://localhost:5177
```

后端可用后运行：

```bash
pnpm test:e2e:auth-state
```

脚本会调用 `/user/login`，并把 Playwright 可复用的本机登录态写到 `.auth/e2e-storage-state.json`。`.auth/` 是固定的本机认证缓存目录，已被 gitignore 忽略，不要提交。

Playwright 测试复用方式：

```ts
const context = await browser.newContext({
  storageState: ".auth/e2e-storage-state.json",
});
```

已经打开页面的 Browser / Computer Use 测试可生成页面注入脚本：

```bash
pnpm e2e:browser-auth-snippet -- --output .auth/e2e-browser-auth-snippet.js
```

在目标页面执行生成脚本即可写入同一份 `token` / `uid` 并自动刷新页面。目标页面 origin 必须与 `TC_E2E_APP_ORIGIN` 一致；如果 storageState 中有多个 origin，可加 `--origin http://localhost:5177` 指定。

## OpenAPI 与共享包

- `packages/tuanchat-openapi-client`：生成的 TuanChat OpenAPI client、模型和基础 request 逻辑。
- `api/`：Web 端 API 实例、认证请求封装、React Query hooks、WebSocket 入口和 NovelAI client。
- `packages/tuanchat-query`：可在 Web / Mobile 之间复用的查询和缓存更新逻辑。
- `packages/tuanchat-domain`：纯业务规则、消息草稿、消息类型、状态指令、骰子等可复用领域逻辑。
- `packages/tuanchat-local-db`：本地数据库相关共享逻辑。

后端接口变化后，优先同步 OpenAPI JSON，再运行：

```bash
pnpm openapi
```

不要手改生成产物来绕过类型或接口问题。

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

## CI/CD

Web 部署：

- Cloudflare Pages Git 集成负责自动部署；`tuan-chat-web` 连接 `main` 分支并对应 `https://tuan.chat/`，`tuan-chat-web-test` 连接 `dev` 分支并对应 `https://test.tuan.chat/`。
- 两个 Pages 项目都使用构建命令 `pnpm run build`，输出目录 `dist`。
- 构建脚本会在 Cloudflare Pages 环境中按分支自动选择模式：`main` 使用 `.env.production`，`dev` 使用 `.env.test`。
- API、WebSocket、TTS 与媒体域名由 `.env.production` / `.env.test` 显式配置为直连地址；Cloudflare Pages 控制台或手动部署 workflow 中的同名变量会覆盖仓库文件。
- `.github/workflows/cd.yaml` 是 Cloudflare Pages 手动兜底部署入口。
- `deploy_env=test` 会使用 `tuan-chat-web-test` 项目和 `test` mode。
- `deploy_env=production` 会使用 `tuan-chat-web` 项目和 `production` mode。
- 构建产物目录为 `dist`，部署命令使用 `wrangler pages deploy dist`。
- 线上 Web 运行时使用环境变量中的直连域名访问 API、WebSocket、TTS 与媒体资源，不再把主流量打到 Pages Functions。
- 短连接 REST/API 的 QUIC 升级落在 Cloudflare 边缘层：公网 `tuan.chat`、`test.tuan.chat`、`api.tuan.chat` 等域名由 Cloudflare 返回 `alt-svc: h3=":443"`；源站 `24.233.10.150` 仍由 Nginx 1.24 在 80 端口反代到后端，源站 443 当前不开放。
- Pages Functions 仅作为旧同源路径和特殊路径兜底：`public/_routes.json` 限定只有 `/api`、`/ws`、`/tts`、`/terre`、`/media`、`/avatar`、`/updates` 会触发 Functions；静态资源和 SPA fallback 保持 Pages 静态托管。

Electron 增量更新：

- `.github/workflows/electron-update-publish.yml` 在 `main` push 或手动触发时运行。
- 未配置 `WEBGAL_TERRE_RELEASE_URL` 时会跳过发布。
- 工作流构建 Windows NSIS 包，收集 `latest.yml`、`*Setup*.exe` 和 `*.blockmap`，并发布到 `https://tuan.chat/updates/` 对应目录。

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

- 新增或修改测试文件后，按影响范围运行对应 Vitest、e2e 或 package 测试；不要因为局部测试改动默认扩大到全量。
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
