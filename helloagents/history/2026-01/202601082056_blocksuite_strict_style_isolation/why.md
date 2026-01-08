# 变更提案: BlockSuite 嵌入场景样式强隔离

## 需求背景
当前项目在“空间/房间描述、Doc、个人简介”等页面嵌入了 BlockSuite 编辑器。实际使用中发现：

1. 打开挂载了 BlockSuite 的页面后，站点同页的其它 UI（尤其是 space/设置页的外层布局与组件）会出现 CSS/交互变化。
2. BlockSuite 首次加载存在延迟，在加载期间会发生“样式突变/闪烁”，影响体验。

这类问题的根因通常是第三方编辑器在初始化过程中：
- 注入全局 `<style>/<link>` 或修改 `document.adoptedStyleSheets`，影响全站 CSS 级联；
- 直接修改 `document.body` 的内联样式（例如 `pointer-events/overflow/cursor`），影响同页其它区域交互与样式。

本变更目标是把 BlockSuite 的样式与交互副作用严格限制在编辑器自身范围内，确保同页其它 UI 不被影响。

## 变更内容
1. 将 `BlocksuiteDescriptionEditor` 的渲染容器升级为 Shadow DOM 挂载（与现有 `BlocksuiteUserReadme` 方案对齐）。
2. 将 BlockSuite 运行时 CSS 与其动态注入的样式/portal 统一导入/迁移到 ShadowRoot 内，避免全局污染与加载期间闪烁。
3. 对 blocksuite 上游中“直接修改 document.body 样式”的行为做兼容补丁，使其优先作用于编辑器所在的 ShadowHost，而非全局 body。

## 影响范围
- **模块:**
  - BlockSuite 嵌入/运行时：`app/components/chat/infra/blocksuite/*`
  - 描述编辑器：`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - pnpm patchedDependencies：`package.json` + `patches/*`
- **文件:**
  - `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - `app/components/chat/infra/blocksuite/embedded/blocksuiteStyleIsolation.ts`
  - `app/components/chat/infra/blocksuite/styles/*`
  - `package.json`
  - `patches/*`
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: 打开 BlockSuite 页面不影响同页其它 UI
**模块:** BlockSuite 嵌入（空间/房间描述、Doc）
打开包含 BlockSuite 的页面时，编辑器正常渲染，但页面其它区域（按钮、布局、主题、滚动、交互）不应发生变化。

#### 场景: 进入空间设置页（含空间描述编辑器）
进入 `/chat/:spaceId/setting`，右侧描述编辑器加载完成或加载中时：
- 同页其它组件样式不变化
- 同页其它组件仍可正常点击/滚动（不被 `pointer-events` 影响）

### 需求: BlockSuite 加载期间不再出现全局样式闪烁
**模块:** BlockSuite 样式加载
首次打开相关页面时，BlockSuite 初始化较慢，但不应导致站点全局 CSS 在加载期间被注入/覆盖。

#### 场景: 首次进入 DocRoute
进入 `/doc/:spaceId/:docId`：
- 仅编辑器区域显示“加载中”占位
- 站点其它区域无样式突变

## 风险评估
- **风险:** Shadow DOM 下 blocksuite 的 portal（tooltip/menu/modal）默认会挂到 `document.body`，若不处理可能出现样式缺失或仍影响全局。
  - **缓解:** 将 `.blocksuite-portal` 容器在运行期迁移到 ShadowRoot 内，确保样式/交互都被隔离。
- **风险:** 上游 blocksuite 内部直接操作 `document.body`（如表格拖拽/链接弹窗/数据视图拖拽）会影响全站。
  - **缓解:** 通过 pnpm patchedDependencies 将这些操作重定向到 ShadowHost（或局部容器）而非全局 body。

