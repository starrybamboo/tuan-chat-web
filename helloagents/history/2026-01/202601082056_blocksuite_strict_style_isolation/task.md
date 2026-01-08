# 任务清单: BlockSuite 嵌入场景样式强隔离

目录: `helloagents/plan/202601082056_blocksuite_strict_style_isolation/`

---

## 1. 描述编辑器（BlocksuiteDescriptionEditor）
- [√] 1.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 中改为 ShadowRoot 挂载 blocksuite DOM，验证 why.md#需求-打开-blocksuite-页面不影响同页其它-ui-场景-进入空间设置页含空间描述编辑器
- [√] 1.2 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 中在动态 import blocksuite 前启动隔离器，并在 ShadowRoot 内实现加载中占位，验证 why.md#需求-blocksuite-加载期间不再出现全局样式闪烁-场景-首次进入-docroute

## 2. 样式/Portal 隔离器增强
- [√] 2.1 在 `app/components/chat/infra/blocksuite/embedded/blocksuiteStyleIsolation.ts` 中支持为 `.blocksuite-portal` 的 ShadowRoot 注入 blocksuite 运行时样式，避免 portal 依赖全局样式，验证 why.md#需求-打开-blocksuite-页面不影响同页其它-ui

## 3. blocksuite 运行时 CSS 注入（Shadow 兼容）
- [√] 3.1 新增 `app/components/chat/infra/blocksuite/styles/ensureBlocksuiteScopedStyles.ts`：将 blocksuite 运行时 CSS 以文本方式注入 ShadowRoot，并将 `:root{}` 重写为 `:host{}`，验证 why.md#需求-blocksuite-加载期间不再出现全局样式闪烁

## 4. 上游副作用补丁（pnpm patchedDependencies）
- [√] 4.1 为 `@blocksuite/affine-block-table@0.22.4` 增加补丁：移除 `document.body.style.pointerEvents` 的全局写入，验证 why.md#需求-打开-blocksuite-页面不影响同页其它-ui
- [√] 4.2 为 `@blocksuite/affine-inline-link@0.22.4` 增加补丁：将 `document.body.style.overflow` 重定向到 ShadowHost（fallback 到 body），验证 why.md#需求-打开-blocksuite-页面不影响同页其它-ui
- [√] 4.3 为 `@blocksuite/data-view@0.22.4` 增加补丁：将 `document.body.style.cursor` 重定向到 ShadowHost（fallback 到 body），验证 why.md#需求-打开-blocksuite-页面不影响同页其它-ui
- [√] 4.4 更新 `package.json` 的 `pnpm.patchedDependencies` 指向新增补丁文件

## 5. 安全检查
- [√] 5.1 检查补丁不涉及生产环境操作/敏感信息/权限变更（按G9）

## 6. 文档更新
- [√] 6.1 更新 `helloagents/CHANGELOG.md` 记录本次修复（强隔离与闪烁修复）
- [√] 6.2 视需要补充 `helloagents/wiki/vendors/blocksuite/` 中“嵌入式隔离注意事项”说明

## 7. 验证
- [?] 7.1 本地运行并手动回归：空间设置/房间设置/Doc/个人简介；并触发表格拖拽/数据视图拖拽/链接弹窗，确认同页其它 UI 不受影响
  > 备注: 已通过 `pnpm typecheck`；仍需在浏览器/Electron 中手工回归上述交互场景。
