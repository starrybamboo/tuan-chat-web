# 技术设计: Blocksuite 全屏 @ 弹窗可见性修复（补充）

## 技术方案
### 核心技术
- DOM 运行时判断 fullscreenElement
- 根据 fullscreenElement 与 iframe 关系选择挂载目标

### 实现要点
- 优先尝试 top document 以覆盖宿主层级
- 若 top document 处于全屏且 fullscreenElement 为 iframe 且 contentDocument 为当前文档，则在当前文档挂载
- 若 fullscreenElement 为其它元素，则将弹窗挂载到 fullscreenElement 内

## 架构设计
无需架构变更

## 安全与性能
- 安全: UI 层级调整，不涉及敏感数据
- 性能: 仅增加少量判断与 DOM 挂载逻辑

## 测试与部署
- 测试: 手动验证全屏画布下 @ 弹窗可见与可交互
- 部署: 随前端发布
