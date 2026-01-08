# @blocksuite/std（0.22.4）

## 1. 定位

`@blocksuite/std` 可以理解为 Blocksuite 的“标准能力集”，按领域提供：
- extension/spec/view 等编辑器标准抽象
- selection/command/event 等基础交互与框架能力
- gfx/inline 等子域能力（可独立使用）

在本项目中，`ToolController` 来自 `@blocksuite/std/gfx`（见 `app/components/chat/infra/blocksuite/spec/affineSpec.ts`）。

---

## 2. 入口与模块边界（以 exports 为准）

- 根入口：`@blocksuite/std`（`.`）
- 子路径：
  - `@blocksuite/std/gfx`
  - `@blocksuite/std/inline`
  - `@blocksuite/std/effects`

根入口（`src/index.ts`）对外再导出多个领域模块：
- clipboard / command / event / extension / scope / selection / spec / view

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/std/package.json`
- 源码目录：`node_modules/@blocksuite/std/src/`
- 编译产物：`node_modules/@blocksuite/std/dist/`

