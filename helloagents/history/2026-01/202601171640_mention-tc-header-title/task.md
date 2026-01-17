# 任务清单: @ 提及菜单标题使用 tc_header

目录: `helloagents/plan/202601171640_mention-tc-header-title/`

---

## 1. blocksuite runtime

- [√] 1.1 在 `tuan-chat-web/app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` 的标题派生逻辑中优先读取 `tc_header.title`，验证 why.md#需求-@-菜单展示业务标题-场景-输入-@-打开文档列表
- [√] 1.2 在 `tuan-chat-web/app/components/chat/infra/blocksuite/runtime/spaceWorkspace.ts` 的标题水合流程中同步更新 meta.title（必要时覆盖旧值），验证 why.md#需求-@-菜单展示业务标题-场景-输入-@-打开文档列表，依赖任务1.1

## 2. editor（可选）

- [√] 2.1 在 `tuan-chat-web/app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx` 中监听 `tc_header.title` 变更并同步调用 `ensureDocMeta(title)`，验证 why.md#需求-@-菜单展示业务标题-场景-输入-@-打开文档列表

## 3. 安全检查

- [√] 3.1 执行安全检查（避免循环写入、避免在只读路径写 doc）

## 4. 文档更新（知识库）

- [√] 4.1 更新 `tuan-chat-web/helloagents/wiki/modules/app.md` 或相关 blocksuite 模块文档：说明 `@` 标题来源与 tc_header 优先级
- [√] 4.2 更新 `tuan-chat-web/helloagents/CHANGELOG.md`

## 5. 验证

- [√] 5.1 执行 `tuan-chat-web` 本地构建或类型检查，确认无编译错误
