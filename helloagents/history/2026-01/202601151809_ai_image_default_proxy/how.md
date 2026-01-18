# 技术设计: AI 生图 Web 默认切回同源代理

## 技术方案

### 实现要点
- 新增本地存储 key：`tc:ai-image:request-mode`
- 初始化时优先读取本地存储；无则默认 `proxy`
- `useEffect` 在变更时写回本地存储

## 测试与部署

- **测试:** `pnpm typecheck` / `pnpm lint`
- **手动验证:** 切换 Connection 的“直连/同源代理”后刷新页面，确认选择保持
