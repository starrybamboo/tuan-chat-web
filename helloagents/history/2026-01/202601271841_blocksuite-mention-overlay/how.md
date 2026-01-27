# 技术设计: Blocksuite @ 弹窗层级修复

## 技术方案
### 核心技术
- 前端: React/TypeScript DOM 操作
- 样式: 直接设置 z-index 或可选 CSS 变量

### 实现要点
- 在 quickSearchService 中为 overlay 使用最高层级 z-index
- 当存在同源 top window 时，优先挂载到顶层 document.body，避免 iframe 内层级受限
- 保持当前 fixed 居中布局与关闭逻辑不变

## 架构设计
无需架构变更

## 安全与性能
- 安全: 仅前端 UI 层级调整，无权限与数据风险
- 性能: 仅新增少量 DOM 操作，不影响渲染性能

## 测试与部署
- 测试: 手动验证全屏画布下 @ 弹窗可见/可操作
- 部署: 随前端发布
