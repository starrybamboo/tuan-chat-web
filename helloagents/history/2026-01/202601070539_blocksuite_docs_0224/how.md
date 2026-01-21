# 技术设计: BlockSuite 0.22.4 文档（对外可用内容）

## 技术方案

### 核心技术

- React 19 + TypeScript（本项目技术栈）
- BlockSuite（`@blocksuite/*@0.22.4`）

### 实现要点

- 文档结构采用“模块入口 + 包索引 + 场景指南”的组合：
  - 模块入口：`helloagents/wiki/modules/blocksuite.md`
  - 包索引：每个包一份文档，重点写清“是什么 / 什么时候用 / 常用 subpath exports / 关键概念”
  - 场景指南：嵌入编辑器 / 协同同步 / 块渲染 / 导入导出
- 所有入口路径以 `node_modules/@blocksuite/*/package.json#exports` 为事实来源，确保与实际安装版本一致。
- 文档中的“本项目示例/落点”优先引用现有集成代码（例如 `app/components/chat/infra/blocksuite/**`）。

## 信息来源与真实性（SSOT）

1. **对外入口（imports）SSOT**：`node_modules/@blocksuite/<pkg>/package.json#exports`
2. **本项目集成用法 SSOT**：`app/components/chat/infra/blocksuite/**` 与 `app/components/chat/shared/**`
3. **版本 SSOT**：`package.json` 与 `pnpm-lock.yaml` 中锁定的 `0.22.4`

> 说明：本项目中存在部分 Blocksuite 类型检查 stub（`app/types/blocksuite/*`），文档需要说明它的用途与限制，避免误解为“真实 API 定义”。

## 文档结构（拟新增）

- `helloagents/wiki/blocksuite/index.md`：总览 + 快速入口 + 包之间关系图（概念层）
- `helloagents/wiki/blocksuite/package-*.md`：逐包说明（以 exports 为纲）
  - `@blocksuite/global`
  - `@blocksuite/store`
  - `@blocksuite/std`
  - `@blocksuite/sync`
  - `@blocksuite/affine`
  - `@blocksuite/affine-model`
  - `@blocksuite/affine-shared`
  - `@blocksuite/affine-components`
  - `@blocksuite/integration-test`
- `helloagents/wiki/blocksuite/guide-*.md`：场景指南
  - `guide-embed-react.md`
  - `guide-sync-collaboration.md`
  - `guide-block-rendering.md`
  - `guide-import-export.md`
- `helloagents/wiki/modules/blocksuite.md`：模块入口文档（并在 `helloagents/wiki/overview.md` 模块索引中登记）

## 安全与性能

- **安全:** 文档不引导任何生产环境操作，不涉及密钥/令牌写入；涉及协同网络时，强调不要在文档中硬编码服务端地址与凭据。
- **性能:** 文档强调“按需加载/避免在 React render 中重复初始化 workspace/std scope”，并给出最佳实践提示（只写原则，不写与当前代码不一致的实现细节）。

## 测试与验证

- 文档内引用的路径与入口需要可在仓库中定位（通过文本检索/路径存在性校验）。
- 不引入新的依赖与构建流程；如需验证 import 路径，仅进行静态核对（exports 与现有使用代码对齐）。

