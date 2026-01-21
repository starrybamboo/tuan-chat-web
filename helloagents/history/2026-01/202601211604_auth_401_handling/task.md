# 轻量迭代：401 / Token 失效处理

目标：当后端返回 401 或 WebSocket 推送 token 失效时，前端自动清理本地登录态并引导重新登录，避免“看起来已登录但全接口 401”的卡死状态。

任务清单：
- [√] 1. 新增统一 unauthorized 处理：清理 `localStorage.token/uid`、落地 toast 提示并跳转 `/login?redirect=...`
- [√] 2. OpenAPI Fetch 客户端：捕获 401（排除 `/user/login`、`/user/register`）触发重新登录
- [√] 3. WebSocket：处理 `type=100`（token 失效）并触发重新登录
- [√] 4. 新增 `/login` 路由页面以承接跳转（兼容邀请链接跳转）
- [√] 5. 登录成功后按 `redirect` 返回原页面（否则回到 `/chat`）
- [√] 6. App 启动时消费 toast（展示“登录过期/连接已断开”等提示）

验证：
- [√] 运行 `pnpm -C tuan-chat-web typecheck`
