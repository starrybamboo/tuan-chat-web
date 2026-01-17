# 任务清单: Blocksuite @ 提及弹窗重复插入修复

目录: `helloagents/plan/202601171345_blocksuite-mention-fix/`

---

## 1. 提及弹窗关闭与动作收敛
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中为成员菜单 action 增加 `abort()` 调用，确保选择后弹窗关闭，并验证 why.md#需求-@-提及仅插入一次并关闭弹窗-场景-空间描述选择成员

## 2. 提及插入防重入保护
- [√] 2.1 在 `app/components/chat/infra/blocksuite/services/mentionPicker.ts` 中增加最小防重入保护，避免同一选择重复插入，验证 why.md#需求-@-提及仅插入一次并关闭弹窗-场景-空间描述选择成员

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/app.md`，记录本次 @ 提及修复与关键行为
- [√] 4.2 更新 `helloagents/CHANGELOG.md` 记录修复条目

## 5. 测试
- [-] 5.1 手动验证: 空间描述输入 `@` 后选择成员（点击/回车），仅插入一次并关闭弹窗
  > 备注: 未执行手动验证
