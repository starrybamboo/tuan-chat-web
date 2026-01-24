# 轻量迭代：WebGAL 实时预览统一重建策略

任务清单：
- [√] RealtimeRenderOrchestrator：统一检测消息序列变更（插入/删除/移动/重排）并 debounce 全量重建
- [√] RealtimeRenderOrchestrator：尾部追加消息仍走增量追加（支持一次追加多条）
- [√] ChatFrame：移除拖拽移动时“手动触发 WebGAL 重建”，改由编排器统一处理
- [√] 质量验证：`pnpm typecheck` 通过；对相关改动文件执行 eslint 无错误

