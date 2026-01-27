# 任务清单: WebGAL 实时渲染禁用自动跳转

目录: `helloagents/plan/202601231830_webgal_disable_autojump/`

---

## 1. 实时渲染逻辑
- [√] 1.1 在 `app/webGAL/realtimeRenderer.ts` 中移除 renderHistory/renderMessage 的自动跳转发送，验证 why.md#需求-禁用自动跳转-场景-实时渲染写入

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 不引入危险指令、不暴露敏感信息）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/webgal.md` 记录自动跳转已关闭
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 记录变更

## 4. 测试
- [-] 4.1 手动验证实时渲染写入后预览不自动跳转，手动跳转仍可用
  > 备注: 未进行本地手动验证
