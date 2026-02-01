# 变更提案: Blocksuite 依赖文档补全（0.22.4）

## 需求背景

当前项目在 `package.json` 中锁定使用 `@blocksuite/*@0.22.4`（AFFiNE/Blocksuite 生态），并在 `app/components/chat/infra/blocksuite/` 下存在一套集成代码。

由于 Blocksuite 包数量多、入口以“子路径导出（subpath exports）”为主，且部分包存在 `src`/`dist` 并存、构建期需转译等情况，开发者在排查问题或新增能力时容易出现：
- 不清楚应该从哪个包/子路径导入
- 无法快速定位“某个 import 对应 node_modules 中的哪个文件”
- 不清楚哪些能力属于稳定基础层（global/store/std/sync），哪些是 AFFiNE 上层封装（affine/affine-*）

因此需要补齐一组“可查阅、可持续维护”的依赖文档，作为本项目 SSOT（`helloagents/wiki/`）的一部分。

## 变更内容

1. 在知识库新增 Blocksuite 依赖文档索引页与各包说明页（聚焦本项目实际依赖的 9 个包）。
2. 固化“从 import → exports → 源码文件”的查阅路径，减少读源码的摩擦。
3. 将 Blocksuite 依赖文档挂接到知识库索引与 `app` 模块文档中，方便发现。

## 影响范围

- **模块:** 文档/知识库（不涉及运行时代码变更）
- **文件:** `helloagents/wiki/*`、`helloagents/CHANGELOG.md`、`helloagents/history/index.md`
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: 依赖能力定位
**模块:** 文档/知识库
当开发者看到项目中出现 `@blocksuite/...` 的导入路径时，能够快速回答：
- 这个包/子路径主要提供什么能力
- 在 node_modules 中对应哪个入口文件/Ŀ¼
- 在本项目中哪里已经用到类似能力

#### 场景: 从 import 定位源码文件
给定 `import { nanoid, Schema, Transformer } from "@blocksuite/affine/store";`：
- 能在文档中找到该子路径的定位与入口位置
- 能根据 `exports` 规则定位到 node_modules 对应文件

### 需求: 构建与调试注意事项
**模块:** 文档/知识库
在遇到构建报错（例如 node_modules 中新语法、src/ts 直出等）时，文档应提示：
- 本项目的 Blocksuite 包存在 `src`/`dist` 并存
- `package.json exports` 可能指向 `src/*.ts`
- 如需稳定构建，可考虑 alias 指向 `dist`（以项目现有实践为准）

