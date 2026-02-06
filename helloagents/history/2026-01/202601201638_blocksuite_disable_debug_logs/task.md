# 任务清单: Blocksuite 关闭默认 debug 控制台输出

Ŀ¼: `helloagents/plan/202601201638_blocksuite_disable_debug_logs/`

---

## 1. blocksuite
- [√] 1.1 新增 `app/components/chat/infra/blocksuite/debugFlags.ts`：默认关闭 debug；仅在 `tc:blocksuite:debug=1` 或 `__TC_BLOCKSUITE_DEBUG=true` 时开启
- [√] 1.2 将 Blocksuite 相关的 `console.warn` 调试输出改为：默认不输出（受 debugFlags 控制）

## 2. 文档更新
- [√] 2.1 更新 `helloagents/CHANGELOG.md`（Unreleased）说明默认关闭 debug 日志

## 3. 验证
- [√] 3.1 执行 `pnpm -C tuan-chat-web typecheck`

## 4. 归档与集成
- [√] 4.1 迁移方案包至 `helloagents/history/YYYY-MM/` 并更新 `helloagents/history/index.md`
- [√] 4.2 自动集成 session 分支到集成分支并更新测试分支
