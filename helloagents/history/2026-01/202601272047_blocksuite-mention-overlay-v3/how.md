# 技术设计: Blocksuite 画布全屏遮挡 @ 弹窗修复（CSS 全屏兜底）

## 技术方案
### 核心技术
- DOM 运行时挂载目标选择
- Fullscreen API 与 CSS 全屏双路径兼容

### 实现要点
- 默认使用当前 document/body 挂载
- 仅在 fullscreenElement 存在时切换到 fullscreenElement 或对应 iframe 文档

## 架构设计
无需架构变更

## 安全与性能
- 安全: 仅 UI 层级调整
- 性能: 轻量 DOM 操作

## 测试与部署
- 测试: 手动验证 CSS 全屏与 Fullscreen API 两种场景
- 部署: 随前端发布
