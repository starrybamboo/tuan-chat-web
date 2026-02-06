# 任务清单: Vite 预打包缺失 chunk（dev）

Ŀ¼: `helloagents/plan/202601161044_vite_deps_missing_chunk/`

---

## 1. 开发脚本
- [√] 1.1 调整 `package.json` 的 `dev` 脚本，默认启用 `react-router dev --force`，避免 `.vite/deps` 缓存不一致导致的 “The file does not exist .../node_modules/.vite/deps/chunk-*.js” 报错

## 2. 文档同步
- [√] 2.1 更新 `helloagents/wiki/modules/tooling.md`：补充 Vite 依赖预打包（optimizeDeps）缓存异常的排查与建议命令
- [√] 2.2 更新 `helloagents/CHANGELOG.md`：记录本次修复

## 3. 验证
- [√] 3.1 执行 `pnpm dev` 并验证启动成功（必要时附加 `--force` 复现/规避场景）
