# 任务清单: Blocksuite 嵌入场景样式隔离（官方兼容方案）

目录: `helloagents/history/2026-01/202601082212_blocksuite_style_isolation_official/`

---

## 1. Blocksuite 嵌入与样式隔离
- [√] 1.1 移除 ShadowRoot 挂载：更新 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
- [√] 1.2 移除 ShadowRoot 挂载：更新 `app/components/profile/profileTab/components/BlocksuiteUserReadme.tsx`
- [√] 1.3 新增运行时样式注入：实现 `app/components/chat/infra/blocksuite/styles/ensureBlocksuiteRuntimeStyles.ts`
- [√] 1.4 调整全局隔离器 API：更新 `app/components/chat/infra/blocksuite/embedded/blocksuiteStyleIsolation.ts`

## 2. 上游副作用补丁
- [√] 2.1 更新 `patches/@blocksuite__affine-inline-link@0.22.4.patch`：overflow 写入限制到 blocksuite scope/portal
- [√] 2.2 更新 `patches/@blocksuite__data-view@0.22.4.patch`：cursor 写入限制到 blocksuite scope/portal
- [√] 2.3 清理 portal shadowDom 补丁：移除 `@blocksuite/affine-widget-linked-doc`、`@blocksuite/affine-widget-keyboard-toolbar` patch 及其 patchedDependencies

## 3. 测试
- [√] 3.1 执行 `pnpm install`
- [√] 3.2 执行 `pnpm typecheck`

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`
