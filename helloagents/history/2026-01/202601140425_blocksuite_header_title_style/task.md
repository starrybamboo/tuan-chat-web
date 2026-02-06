# 任务清单: Blocksuite tcHeader 替代内置标题并对齐样式

Ŀ¼: `helloagents/plan/202601140425_blocksuite_header_title_style/`

---

## 1. Blocksuite specs（禁用内置标题）
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中加固 `disableDocTitle`：过滤 `DocTitleViewExtension` 时增加按 `name=affine-doc-title-fragment` 的兜底匹配，验证 why.md#需求-描述文档标题统一-场景-进入空间房间设置页编辑描述

## 2. tcHeader UI（样式对齐 doc-title）
- [√] 2.1 在 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 中调整 `tcHeader` DOM 结构与 className（保留现有图片上传/标题同步逻辑），验证 why.md#需求-描述文档标题统一-场景-进入空间房间设置页编辑描述
- [√] 2.2 在 `app/components/chat/infra/blocksuite/styles/blocksuiteRuntime.css` 中新增 `tcHeader` 的作用域样式，标题字体/宽度/内边距对齐 blocksuite 内置 `doc-title`

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 不引入敏感信息、不增加不受控外部请求、不新增高风险权限变更）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`（补充 tcHeader 标题样式对齐说明）
- [√] 4.2 更新 `helloagents/wiki/vendors/blocksuite/index.md`（补充 doc-title 参考来源与相关包说明）
- [√] 4.3 更新 `helloagents/CHANGELOG.md` 记录本次变更

## 5. 测试
- [√] 5.1 运行 `pnpm typecheck`，确保 TypeScript/React Router typegen 通过
