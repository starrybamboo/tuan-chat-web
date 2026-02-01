# 任务清单: Blocksuite @ 菜单标题使用 tc_header

Ŀ¼: `helloagents/plan/202601191041_blocksuite_mention_tc_header_menu/`

---

## 1. @ 菜单标题来源改造
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中新增 tc_header 读取与缓存逻辑，验证 why.md#需求-@-菜单标题使用-tc_header-场景-打开-@-弹窗即显示-tc_header
- [√] 1.2 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中改写 doc 菜单构建与搜索逻辑，验证 why.md#需求-@-菜单标题使用-tc_header-场景-搜索使用-tc_header
- [√] 1.3 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中保证缺失 tc_header 不回退 Untitled，验证 why.md#需求-@-菜单标题使用-tc_header-场景-ȱʧ-tc_header-不回退

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/blocksuite.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`

## 4. 测试
- [-] 4.1 手动测试: @ 菜单标题为 tc_header；缺失 tc_header 为空标题
  > 备注: 未执行手动测试。
- [-] 4.2 手动测试: @ 搜索按 tc_header 过滤
  > 备注: 未执行手动测试。
