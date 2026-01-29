# 任务清单: Blocksuite 全屏 @ 弹窗可见性修复（补充）

目录: `helloagents/plan/202601271925_blocksuite-mention-overlay-v2/`

---

## 1. blocksuite 弹窗挂载修复
- [√] 1.1 在 `app/components/chat/infra/blocksuite/quickSearchService.ts` 中根据 fullscreenElement 选择挂载目标，验证 why.md#需求-全屏画布下-@-弹窗可见-场景-画布全屏-+-@-触发

## 2. 安全检查
- [√] 2.1 执行安全检查（按 G9: 输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 文档更新
- [√] 3.1 更新知识库模块文档（如 `helloagents/wiki/modules/blocksuite.md`）

## 4. 测试
- [-] 4.1 手动验证场景：全屏画布下 @ 弹窗可见且可交互
  > 备注: 未在本地执行手动验证
