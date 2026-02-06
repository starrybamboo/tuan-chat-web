# 任务清单: Blocksuite @ 提及点击链路调试日志

Ŀ¼: `helloagents/plan/202601171622_blocksuite-mention-click-debug/`

---

## 1. 点击事件链路日志
- [√] 1.1 在 `app/routes/blocksuiteFrame.tsx` 中增加 pointerdown/click 捕获与 debug-log 上报（按下 `@` 后 5s 内限量上报 + 命中 mention 线索时常驻上报），用于定位“点击候选项”真实 DOM/组件

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 文档更新
- [√] 3.1 更新 `helloagents/CHANGELOG.md` 记录本次调试增强

## 4. 测试
- [-] 4.1 开发环境点击提及候选项，确认宿主控制台输出事件摘要
  > 备注: 未执行手动验证
