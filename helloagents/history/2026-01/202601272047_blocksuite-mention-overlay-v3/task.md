# 任务清单: Blocksuite 画布全屏遮挡 @ 弹窗修复（CSS 全屏兜底）

目录: `helloagents/plan/202601272047_blocksuite-mention-overlay-v3/`

---

## 1. 弹窗挂载策略调整
- [√] 1.1 在 `app/components/chat/infra/blocksuite/quickSearchService.ts` 中默认挂载在当前文档，并保留 fullscreenElement 兜底，验证 why.md#需求-css-全屏画布下-@-弹窗可见-场景-css-全屏-+-@-触发

## 2. 安全检查
- [√] 2.1 执行安全检查（按 G9: 输入验证、敏感信息处理、权限控制、EHRB 风险规避）

## 3. 文档更新
- [√] 3.1 更新知识库模块文档（`helloagents/wiki/modules/blocksuite.md`）

## 4. 测试
- [-] 4.1 手动验证场景：CSS 全屏与 Fullscreen API 全屏下 @ 弹窗可见且可交互
  > 备注: 未在本地执行手动验证
