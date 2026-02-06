# 任务清单: React hooks invalid call（dev 缓存/˫ React 实例）

Ŀ¼: `helloagents/plan/202601161133_react_invalid_hook_cache/`

---

## 1. 缓存清理与启动脚本
- [√] 1.1 新增 `scripts/dev.mjs`：开发启动前清理遗留的 `node_modules/.vite/`，避免在切换 `cacheDir` 后浏览器仍加载到旧 optimize deps，导致 React 被加载两份（典型报错：`Cannot read properties of null (reading 'useEffect')`）
- [√] 1.2 调整 `package.json`：`pnpm dev` 使用上述脚本；新增/保留 `pnpm dev:force` 作为兜底（清理缓存并 `--force` 重建预打包）

## 2. Vite 解析去重
- [√] 2.1 在 `vite.config.ts` 添加 `resolve.dedupe`（至少包含 `react`/`react-dom`），降低 pnpm 场景下多 React 实例的概率

## 2.5 React Router 预渲染（稳定性）
- [√] 2.5.1 在 `react-router.config.ts` 关闭 `prerender`，避免构建/评估阶段执行路由导致不稳定行为（与知识库/Changelog 保持一致）

## 3. 文档同步
- [√] 3.1 更新 `helloagents/wiki/modules/tooling.md`：补充 invalid hook call 的排查与对应命令
- [√] 3.2 更新 `helloagents/CHANGELOG.md`：记录本次修复

## 4. 验证
- [√] 4.1 执行 `pnpm dev`（使用非 5177 端口）并确认生成 `node_modules/.vite-tuan-chat-web/` 且不会再加载 `node_modules/.vite/deps/react*.js`
