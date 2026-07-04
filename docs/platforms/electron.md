# Electron 桌面端工程说明

桌面端位于 `apps/desktop`，当前采用 `electron-vite` 只编译 Electron 的 `main` 与 `preload`，渲染进程继续复用 `apps/web` 的 Vite 应用。

## 目录边界

- `apps/desktop/src/main`：Electron 主进程，负责窗口创建、`app://` 协议、自动更新、桌面通知、NovelAI 请求代理、WebGAL_Terre 子进程与 IPC 注册。
- `apps/desktop/src/preload`：只通过 `contextBridge` 暴露 `window.electronAPI`，不把 `ipcRenderer` 或 Node 能力直接交给渲染进程。
- `apps/desktop/src/common`：桌面端 main / preload 共享的 IPC channel 常量。
- `packages/tuanchat-electron-ipc`：web 与 desktop 共享的 Electron API 类型面，是 `window.electronAPI` 的单一类型来源。

## Renderer 复用方式

开发态由 `apps/desktop/scripts/dev.mjs` 启动 `apps/web` 的 Vite dev server，并把实际地址写入 `ELECTRON_START_URL` / `VITE_DEV_SERVER_URL` 后启动 Electron。

生产态先运行 web 构建，再由 `apps/desktop/scripts/sync-web-build.mjs` 把根目录 `dist` 同步到 `apps/desktop/build/client`。主进程注册 `app://` 文件协议，将真实静态资源直接返回，将前端虚拟路由回退到 `index.html`。

## 常用命令

- `pnpm desktop:dev`：启动 web dev server 与 Electron。
- `pnpm --filter @tuanchat/desktop run compile`：编译 main / preload 到 `apps/desktop/electron`。
- `pnpm desktop:build`：校验本地 WebGAL_Terre 发行目录、构建 web、同步 renderer、编译 Electron，并调用 `electron-builder`。

## IPC 约定

新增桌面能力时，先在 `packages/tuanchat-electron-ipc` 补齐请求/响应类型，再在 `apps/desktop/src/common/ipc.ts` 增加 channel 常量，最后分别实现 main handler 与 preload bridge。业务层不要直接依赖裸 channel 字符串，也不要在 preload 暴露完整 `ipcRenderer`。
