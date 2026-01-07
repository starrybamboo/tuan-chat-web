# @blocksuite/affine-model（0.22.4）

## 1. 定位

`@blocksuite/affine-model` 提供 AFFiNE 模型层（blocks/consts/elements/themes/utils）相关定义，是上层编辑能力与存储层之间的重要“类型与模型边界”。

在本项目中，类型 `DocMode` 来自 `@blocksuite/affine/model`（聚合包 `@blocksuite/affine` 通过子路径提供入口）。

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/affine-model`（`.`）

对应的源码结构（`src/` 下）包括：
- `blocks/`：块模型相关
- `consts/`：常量
- `elements/`：元素/组件模型
- `themes/`：主题相关模型
- `utils/`：模型层工具

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/affine-model/package.json`
- 源码目录：`node_modules/@blocksuite/affine-model/src/`
- 编译产物：`node_modules/@blocksuite/affine-model/dist/`

