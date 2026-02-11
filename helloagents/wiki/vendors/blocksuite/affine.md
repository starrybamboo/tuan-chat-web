# @blocksuite/affine（0.22.4）

## 1. 定位（在本项目中的角色）

`@blocksuite/affine` 是 AFFiNE/Blocksuite 的“上层聚合包”，用于组织：
- blocks（块）/ inlines（行内）/ widgets（小部件）等编辑器能力模块的入口
- shared（共享能力）、store（存储/集合）、sync（同步）、std（标准能力集）、global（基础设施）等子域的再导出/整合

注意：本项目环境下 `@blocksuite/affine` 的根入口（`.`）对应文件为 `src/index.ts`，当前实现为 `export {};`，更推荐按子路径导入（见下方“入口与模块边界”）。

---

## 2. 入口与模块边界（以 exports 为准）

`@blocksuite/affine` 主要通过子路径提供能力，常见边界如下：

### 2.1 基础域
- `@blocksuite/affine/global/*`：基础设施（utils/env/exceptions/di 等）
- `@blocksuite/affine/store` / `@blocksuite/affine/store/test`：存储/集合与测试辅助
- `@blocksuite/affine/sync`：同步相关（在 affine 内聚合）
- `@blocksuite/affine/std` / `@blocksuite/affine/std/*`：标准能力集（gfx/inline/effects）

### 2.2 编辑器上层能力
- `@blocksuite/affine/blocks/<name>`：块能力入口（通常还有 `/store`、`/view` 子入口）
- `@blocksuite/affine/inlines/<name>`：行内能力入口（通常还有 `/store`、`/view` 子入口）
- `@blocksuite/affine/widgets/<name>`：小部件入口（通常还有 `/store`、`/view` 子入口）
- `@blocksuite/affine/gfx/<name>`：白板/图形相关模块（通常还有 `/store`、`/view` 子入口）
- `@blocksuite/affine/fragments/<name>/view`：碎片面板/区域视图（如 outline/doc-title）

### 2.3 共享与支撑
- `@blocksuite/affine/shared/*`：跨模块共享的 commands/selection/services/types/utils 等
- `@blocksuite/affine/schemas`：预置 schema 集合（本项目多处使用）
- `@blocksuite/affine/model`：模型层入口（类型与模型结构）
- `@blocksuite/affine/ext-loader`、`@blocksuite/affine/extensions/*`、`@blocksuite/affine/foundation/*`：扩展加载与基础扩展
---

## 3. 常见子路径模式（如何把“文件”与“功能”对应起来）

当你看到以下导入时，可以用这套“约定”快速判断用途：

### 3.1 Blocks / Inlines / Widgets

- `@blocksuite/affine/blocks/<name>`：该块的“聚合入口”（通常负责把 store/view/样式等组合起来）
- `@blocksuite/affine/blocks/<name>/store`：与“数据结构/Schema/命令/扩展注册”相关的代码
- `@blocksuite/affine/blocks/<name>/view`：与“渲染/UI/交互组件”相关的代码

inlines/widgets/gfx 基本同理。

### 3.2 shared

- `@blocksuite/affine/shared/types`：跨域共享的类型
- `@blocksuite/affine/shared/services`：以“服务/Provider/上下文注入”为主的能力
- `@blocksuite/affine/shared/commands`：命令集合/命令构建与调用相关
- `@blocksuite/affine/shared/selection`：选择集/选区相关能力

---

## 4. 与本项目相关的“可直接用”的入口（来自真实导入）

以下是本项目已出现的典型导入点，可作为优先学习与复用对象：

- `@blocksuite/affine/model`：`DocMode`（见 `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`）

---

## 5. 本项目的集成入口（从这里开始读最省力）

- 规格/扩展组装：`app/components/chat/infra/blocksuite/spec/affineSpec.ts`
- 自定义 spec：`app/components/chat/infra/blocksuite/spec/tcSpec.ts`
- embedded editor：`app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.ts`

---

## 6. 源码定位

- `exports` 定义：`node_modules/@blocksuite/affine/package.json`
- 源码目录（按域分组）：`node_modules/@blocksuite/affine/src/`
- 编译产物（如存在）：`node_modules/@blocksuite/affine/dist/`

