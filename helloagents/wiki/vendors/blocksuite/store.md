# @blocksuite/store（0.22.4）

## 1. 定位

`@blocksuite/store` 提供存储/模型/Schema/Transformer 等核心能力（通常基于 yjs），是 Blocksuite 文档数据层的重要基础。

在本项目中已经出现的典型用法包括：
- `Text`（来自 `@blocksuite/store`）
- `defineBlockSchema` / `BlockSchemaExtension`（来自 `@blocksuite/store`）

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/store`（`.`）
- 子路径：
  - `@blocksuite/store/test`：测试辅助工具（例如 TestWorkspace 等）

源码结构（`src/` 下）按领域划分：
- `schema/`：schema 定义与扩展（本项目自定义 spec 时会用到）
- `transformer/`：导入导出与转换
- `model/`：数据模型
- `extension/`：扩展机制
- `yjs/`：yjs 相关封装

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/store/package.json`
- 源码目录：`node_modules/@blocksuite/store/src/`
- 编译产物：`node_modules/@blocksuite/store/dist/`

