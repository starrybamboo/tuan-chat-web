# @blocksuite/integration-test（0.22.4）

## 1. 定位

`@blocksuite/integration-test` 提供 Blocksuite/AFFiNE 集成测试/测试容器/测试管理器相关能力，用于构造测试 editor 容器、view 管理器、store 管理器等。

本项目出现的典型用法：
- `TestAffineEditorContainer`（来自 `@blocksuite/integration-test`）
- `getTestViewManager`（来自 `@blocksuite/integration-test/view`）
- `getTestStoreManager`（来自 `@blocksuite/integration-test/store`）

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/integration-test`（`.`）
- 子路径：
  - `@blocksuite/integration-test/view`
  - `@blocksuite/integration-test/store`
  - `@blocksuite/integration-test/effects`

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/integration-test/package.json`
- 源码目录：`node_modules/@blocksuite/integration-test/src/`
- 编译产物：`node_modules/@blocksuite/integration-test/dist/`

