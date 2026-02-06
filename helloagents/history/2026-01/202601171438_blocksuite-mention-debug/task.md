# 任务清单: Blocksuite @ 提及调试日志

Ŀ¼: `helloagents/plan/202601171438_blocksuite-mention-debug/`

---

## 1. 菜单与选择日志
- [√] 1.1 在 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts` 中增加菜单请求/选择/关闭日志，验证 why.md#需求-@-提及调试信息可观测-场景-空间描述选择成员

## 2. 插入路径日志
- [√] 2.1 在 `app/components/chat/infra/blocksuite/services/mentionPicker.ts` 中增加插入路径日志，验证 why.md#需求-@-提及调试信息可观测-场景-空间描述选择成员

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/CHANGELOG.md` 记录调试日志

## 5. 测试
- [-] 5.1 手动验证控制台日志覆盖完整触发路径
  > 备注: 未执行手动验证
