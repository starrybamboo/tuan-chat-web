# 技术设计 Lint 问题修复

## 技术方案
### 核心技术
- ESLint
- pnpm scripts（`lint`/`lint:fix`）

### 实现要点
- 在 session worktree 中运行 `pnpm lint:fix`
- 针对残留报错逐项修复
- 复跑 `pnpm lint` 确认通过
- 同步更新知识库与变更记录

## 架构设计
<!-- 无架构变更 -->

## API设计
<!-- 无API变更 -->

## 数据模型
<!-- 无数据变更 -->

## 安全与性能
- **安全:** 仅本地 lint 修复，不涉及生产环境
- **性能:** lint 仅在本地执行

## 测试与部署
- **测试:** `pnpm lint`
- **部署:** 无
