# 团剧共创移动端

这个目录是 `Expo + Expo Router` 的移动端应用骨架，和 Web 端共用同一个仓库。

## 当前约定

- 应用目录：`apps/mobile`
- 共享 OpenAPI client：`packages/tuanchat-openapi-client`
- 根目录通过 `pnpm-workspace.yaml` 管理 workspace

## 常用命令

在仓库根目录运行：

```bash
pnpm install
pnpm mobile:start
pnpm mobile:android
pnpm mobile:web
pnpm mobile:typecheck
```

## 当前状态

- 已接入 `@tuanchat/openapi-client`
- 已保留 Expo Router 目录结构
- 已接入 `expo-secure-store`，支持原生端 SecureStore / Web 端 localStorage 的会话存取
- 已接入 `@tanstack/react-query`，并在应用根部注入 QueryClient
- 已提供最小登录态基础设施，可用用户名或用户 ID 登录并拉取当前用户信息
- 还没有接入正式业务页面

## 下一步建议

1. 把登录后首页切到真实业务入口，而不是当前调试页
2. 优先接房间列表页、聊天页，再补资料页和设置页
3. 逐步把 Web 端手写 hooks/查询能力下沉成移动端可复用层
