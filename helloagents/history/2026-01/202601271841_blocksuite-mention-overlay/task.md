# 任务清单: Blocksuite @ 弹窗层级修复

目录: `helloagents/plan/202601271841_blocksuite-mention-overlay/`

---

## 1. blocksuite 弹窗层级调整
- [√] 1.1 在 `app/components/chat/infra/blocksuite/quickSearchService.ts` 中提升 overlay 的层级与挂载位置，验证 why.md#需求-@-弹窗在全屏画布可见-场景-全屏画布下-@-搜索弹窗
- [-] 1.2 如需统一层级变量，在 `app/app.css` 中补充可复用的 overlay z-index 变量或类名，验证 why.md#需求-@-弹窗在全屏画布可见-场景-全屏画布下-@-搜索弹窗
  > 备注: 当前直接在弹窗创建处设置最高层级，暂不新增全局变量

## 2. 安全检查
- [√] 2.1 执行安全检查（按 G9: 输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 文档更新
- [√] 3.1 更新知识库模块文档（如 `helloagents/wiki/modules/blocksuite.md` 或相关模块文档）

## 4. 测试
- [-] 4.1 手动验证场景：全屏画布下 @ 弹窗可见且可交互
  > 备注: 未在本地执行手动验证
