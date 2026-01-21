# 任务清单: lint_fix

目录: `helloagents/plan/202601141740_lint_fix/`

---

## 1. Lint 修复
- [√] 1.1 修复 React Hook `useEffect` 依赖缺失告警（blocksuiteDescriptionEditor）
- [√] 1.2 移除未使用的 Zustand `get` 参数（entityHeaderOverrideStore）
- [√] 1.3 避免 `/var set` 命令解析触发正则超线性回溯风险（webgalVar）
- [√] 1.4 scripts/novelai-openapi：避免使用全局 `process`，清理未使用 `catch` 参数

## 2. 质量验证
- [√] 2.1 执行 `pnpm lint --fix` 并通过

## 3. 文档更新
- [√] 3.1 更新 `helloagents/CHANGELOG.md`
- [√] 3.2 更新 `helloagents/wiki/modules/tooling.md`
- [√] 3.3 更新 `helloagents/history/index.md` 并归档方案包

