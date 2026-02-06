# 技术设计: Blocksuite @ 提及点击链路调试日志

## 技术方案
### 核心技术
- iframe 内捕获 DOM 事件（pointerdown/click），提取 composedPath ժҪ
- 通过 blocksuite-frame 的 postMessage debug-log 通道转发到宿主控制台

### 实现要点
- 仅在 `import.meta.env.DEV` 启用监听与上报。
- 对每次事件提取最多 N 个节点摘要（tag/id/class），并仅在命中 mention 相关关键词时上报。

## 安全与性能
- 安全: 不记录文本内容，仅记录 DOM 结构线索与事件类型。
- 性能: 仅 DEV，且过滤后上报，避免刷屏。

## 测试与部署
- 测试: 开发环境打开空间描述，输入 `@` 并点击候选项，检查宿主控制台日志。
- 部署: 调试完成后可移除或改为可开关。
