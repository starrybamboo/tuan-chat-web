# @blocksuite/sync（0.22.4）

## 1. 定位

`@blocksuite/sync` 提供文档同步相关能力（awareness/blob/doc 等子域），通常与 `@blocksuite/store` 配合使用。

在本项目中，`BlobSource` 出现在 `@blocksuite/affine/sync` 的导入中（affine 聚合包对 sync 做了整合），但底层同步原语可追溯到 `@blocksuite/sync`。

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/sync`（`.`）

源码结构（`src/` 下）包括：
- `awareness/`
- `blob/`
- `doc/`

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/sync/package.json`
- 源码目录：`node_modules/@blocksuite/sync/src/`
- 编译产物：`node_modules/@blocksuite/sync/dist/`

