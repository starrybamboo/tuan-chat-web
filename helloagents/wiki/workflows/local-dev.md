# 本地开发（Web / Electron）

## 1. 前置条件

- Node.js ≥ 22
- pnpm（以 `pnpm-lock.yaml` 为唯一锁文件来源）

## 2. 环境变量

在项目根目录创建 `.env` 或 `.env.development`（以实际环境为准）：

- `VITE_API_BASE_URL`
- `VITE_API_WS_URL`
- `VITE_TERRE_URL`
- `VITE_TERRE_WS`

## 3. 常用命令

- `pnpm install`
- `pnpm dev`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm electron:dev`
- `pnpm electron:build`

## 4. 常见问题

- Vite optimizeDeps chunk 缺失/React hooks 异常：优先执行 `pnpm dev:force`，必要时清理浏览器对 `localhost:5177` 的站点缓存（详见 [modules/tooling.md](../modules/tooling.md)）。

## 5. Worktree 开发

- 推荐用 Git worktree 进行会话隔离（避免并行改动互相覆盖）：[workflows/git-worktree-sessions.md](git-worktree-sessions.md)

