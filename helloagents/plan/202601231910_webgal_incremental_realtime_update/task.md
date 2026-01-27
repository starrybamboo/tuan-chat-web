# 任务清单: WebGAL 实时渲染增量更新

目录: helloagents/plan/202601231910_webgal_incremental_realtime_update/

---

## 1. 渲染器增量能力
- [ ] 1.1 在 pp/webGAL/realtimeRenderer.ts 中增强消息行号记录（覆盖非文本消息），并实现增量重排逻辑，验证 why.md#需求-增量更新实时渲染-场景-消息顺序变化

## 2. 实时渲染 API 与编排
- [ ] 2.1 在 pp/webGAL/useRealtimeRender.ts 中暴露增量重排与设置变更重渲染接口，验证 why.md#需求-增量更新实时渲染-场景-小头像-自动立绘设置变更
- [ ] 2.2 在 pp/components/chat/core/realtimeRenderOrchestrator.tsx 中检测顺序变化与设置变更并触发增量更新，失败回退全量渲染

## 3. 安全检查
- [ ] 3.1 执行安全检查（按G9: 不引入危险指令、不暴露敏感信息）

## 4. 文档更新
- [ ] 4.1 更新 helloagents/wiki/modules/webgal.md 记录增量更新行为
- [ ] 4.2 更新 helloagents/CHANGELOG.md 记录变更

## 5. 测试
- [ ] 5.1 手动验证顺序变化与设置变更的增量更新及回退逻辑
