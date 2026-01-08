# 技术设计: Blocksuite 依赖文档补全（0.22.4）

## 技术方案

### 核心技术
- 以 `node_modules/@blocksuite/*/package.json` 的 `exports` 作为“模块入口清单”的事实来源
- 结合本项目代码（`app/components/chat/infra/blocksuite/`）中的真实导入路径，补充“项目内常用用法/入口”

### 实现要点
- **入口梳理:** 对 9 个包提取 `exports` 的子路径键（例如 `./store`、`./shared/services`），作为可导入的模块边界
- **结构归纳:** 通过目录结构（`src/blocks`、`src/shared`、`src/widgets` 等）建立稳定的分类解释，避免逐文件碎片化说明
- **项目关联:** 在每个包文档中给出本项目已有导入点（文件路径），让读者从“可运行代码”反推使用方式
- **构建提示:** 标注本项目环境下 Blocksuite 包可能走 `src/*.ts` 或 `dist/*` 的差异，并给出排查路径（不新增新的构建规则）

## 安全与性能

- 本次仅新增/更新文档，不涉及运行时代码与权限变更
- 不记录任何密钥/令牌/PII 到知识库

## 测试与验证

- 校验新增 Markdown 文件路径与链接可点击
- 校验知识库索引（`helloagents/wiki/overview.md`、`helloagents/wiki/modules/app.md`）能够发现新文档
- 扫描项目中 `@blocksuite/*` 的导入，确认文档覆盖 9 个包的主入口与与本项目高频用法

