# @blocksuite/affine-components（0.22.4）

## 1. 定位

`@blocksuite/affine-components` 提供 AFFiNE 风格的 UI 组件与面板能力（工具栏、下拉菜单、图标、提示、选择等），通常用于 editor 的 view 层拼装。

---

## 2. 入口与模块边界（以 exports 为准）

本包以“组件子路径”为主要入口，典型形式：
- 根入口：`@blocksuite/affine-components`（`.`）
- 组件入口：`@blocksuite/affine-components/<component>`

当前版本对外导出的组件子路径包括（按 `exports` 汇总）：
- `block-selection` / `block-zero-width`
- `caption` / `citation`
- `color-picker` / `context-menu` / `date-picker`
- `drop-indicator`
- `embed-card-modal`
- `filterable-list`
- `hover` / `icon-button` / `icons`
- `link-preview` / `linked-doc-title`
- `notification` / `peek` / `portal` / `resource`
- `slider`
- `smooth-corner`
- `toast`
- `toggle-button` / `toggle-switch`
- `toolbar`
- `tooltip-content-with-shortcut`
- `view-dropdown-menu` / `card-style-dropdown-menu` / `highlight-dropdown-menu` / `size-dropdown-menu` / `open-doc-dropdown-menu`
- `edgeless-line-width-panel` / `edgeless-line-styles-panel` / `edgeless-shape-color-picker`

---

## 3. 源码定位

- `exports` 定义：`node_modules/@blocksuite/affine-components/package.json`
- 源码目录：`node_modules/@blocksuite/affine-components/src/`
- 编译产物：`node_modules/@blocksuite/affine-components/dist/`

