# 任务清单: Blocksuite iframe 强隔离

Ŀ¼: `helloagents/plan/202601082245_blocksuite_iframe_isolation/`

---

## 1. 路由与iframe承载
- [√] 1.1 新增 iframe 路由 `app/routes/blocksuiteFrame.tsx`，在 iframe 内渲染 `BlocksuiteDescriptionEditorRuntime`，并实现 `set-mode`/`theme` 消息处理，验证 why.md#需求-ͬҳ-ui-不被-blocksuite-污染-场景-打开任意包含-blocksuite-的页面
- [√] 1.2 在 `app/routes.ts` 注册 `blocksuite-frame` 顶层路由，确保不进入 dashboard layout

## 2. BlocksuiteDescriptionEditor 宿主化
- [√] 2.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 导出 `BlocksuiteDescriptionEditorRuntime` 并将默认导出改为 iframe 宿主，主窗口不执行 blocksuite runtime，验证 why.md#需求-重复进入-blocksuite-页面样式稳定-场景-进入-blocksuite-页面--离开--再次进入
- [√] 2.2 通过 `postMessage` 维持 `onActionsChange`/`onModeChange`，并把 Blocksuite 内部导航委托给父窗口（`navigate` 消息）

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: `postMessage` 源校验、避免跨frame控制、无敏感信息硬编码）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`
- [√] 4.3 更新 `helloagents/history/index.md`

## 5. 测试
- [√] 5.1 执行 `pnpm typecheck`
