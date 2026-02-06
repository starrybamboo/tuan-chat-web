# 任务清单: Vite optimize deps chunk 缺失（dev）

Ŀ¼: `helloagents/plan/202601161104_vite_deps_cache_dir/`

---

## 1. Vite 缓存隔离
- [√] 1.1 在 `vite.config.ts` 配置独立 `cacheDir`，避免浏览器/开发服务复用旧的 `node_modules/.vite/deps` 产物导致请求到不存在的 chunk

## 2. 开发脚本
- [√] 2.1 调整 `package.json`：`pnpm dev` 回归默认启动；新增 `pnpm dev:force` 作为强制重建预打包缓存的兜底命令

## 3. 文档同步
- [√] 3.1 更新 `helloagents/wiki/modules/tooling.md`：补充清理/隔离 deps 缓存与浏览器缓存的排查步骤
- [√] 3.2 更新 `helloagents/CHANGELOG.md`：记录本次修复

## 4. 验证
- [√] 4.1 执行 `pnpm dev`，确认启动成功且新 `cacheDir` 目录生成
