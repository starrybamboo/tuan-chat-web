# @blocksuite/global（0.22.4）

## 1. 定位

`@blocksuite/global` 是 Blocksuite 的基础设施层，提供通用工具与基础抽象（DI、异常、环境、可释放资源、基础类型、gfx、lit 等）。

在本项目中，通常不建议从根入口“盲目导入”，而是按子路径导入（更清晰、边界更稳）。

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/global`（`.`）
- 子路径：
  - `@blocksuite/global/utils`
  - `@blocksuite/global/env`
  - `@blocksuite/global/exceptions`
  - `@blocksuite/global/di`
  - `@blocksuite/global/types`
  - `@blocksuite/global/gfx`
  - `@blocksuite/global/disposable`
  - `@blocksuite/global/lit`

与 `@blocksuite/affine` 的关系：`@blocksuite/affine/global/*` 在当前依赖版本下也提供同名子域入口（便于聚合导入）。

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/global/package.json`
- 源码目录：`node_modules/@blocksuite/global/src/`
- 编译产物：`node_modules/@blocksuite/global/dist/`（包含 `index.d.ts/index.js` 等）

