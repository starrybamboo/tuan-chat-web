# 任务清单: Blocksuite @ 提及重复插入二次修复

Ŀ¼: `helloagents/plan/202601171414_blocksuite-mention-fix2/`

---

## 1. 菜单动作去重与关闭加固
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中增加菜单锁定与关闭策略，验证 why.md#需求-@-提及仅插入一次并关闭弹窗-场景-空间描述选择成员

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/CHANGELOG.md` 记录修复条目

## 4. 测试
- [-] 4.1 手动验证: 空间描述输入 `@` 后选择成员（点击/回车），仅插入一次并关闭弹窗
  > 备注: 未执行手动验证
