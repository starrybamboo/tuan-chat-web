# @blocksuite/affine-shared（0.22.4）

## 1. 定位

`@blocksuite/affine-shared` 提供跨域共享能力（adapters/commands/selection/services/theme/styles/types/utils 等），用于把上层编辑能力的公共部分抽象成可复用模块。

在本项目中，`DocModeProvider` 来源于 `@blocksuite/affine/shared/services`（即 affine 聚合包下的 shared 子路径）。

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/affine-shared`（`.`）
- 子路径：
  - `@blocksuite/affine-shared/adapters`
  - `@blocksuite/affine-shared/commands`
  - `@blocksuite/affine-shared/consts`
  - `@blocksuite/affine-shared/selection`
  - `@blocksuite/affine-shared/services`
  - `@blocksuite/affine-shared/styles`
  - `@blocksuite/affine-shared/theme`
  - `@blocksuite/affine-shared/types`
  - `@blocksuite/affine-shared/utils`

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/affine-shared/package.json`
- 源码目录：`node_modules/@blocksuite/affine-shared/src/`
- 编译产物：`node_modules/@blocksuite/affine-shared/dist/`

