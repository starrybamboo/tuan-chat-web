# 技术设计: BlockSuite 嵌入场景样式强隔离

## 技术方案

### 核心技术
- React（现有）
- Shadow DOM（将第三方样式限定在编辑器宿主范围内）
- pnpm patchedDependencies（对上游 blocksuite 的“全局副作用”做最小补丁）

### 实现要点
1. **ShadowRoot 挂载（核心）**
   - `BlocksuiteDescriptionEditor` 使用 `container.attachShadow({ mode: "open" })` 创建/复用 ShadowRoot。
   - 在 ShadowRoot 内创建稳定的 mount 节点，所有 blocksuite 相关 DOM 仅在该 mount 内渲染。

2. **样式隔离与按需加载（核心）**
   - 在 blocksuite 动态 import 之前启动隔离逻辑（与 `BlocksuiteUserReadme` 一致），捕获 blocksuite 初始化阶段的全局副作用。
   - 将 blocksuite 运行时所需的 CSS（theme/fonts/katex + 项目内补丁）注入 ShadowRoot（避免注入到 `document.head` 造成同页闪烁）。
   - 对 `@toeverything/theme` 的 `:root{--affine-*}` 规则进行 Shadow 兼容处理：将 `:root{...}` 重写为 `:host{...}`，使变量在 Shadow 内可用且不污染全局。

3. **Portal 隔离**
   - blocksuite 的 tooltip/menu 等使用 `.blocksuite-portal` 默认 append 到 `document.body`。
   - 在隔离生命周期内监听 `document.body` 新增的 `.blocksuite-portal`，将其迁移到 ShadowRoot 内的 portal host 节点，确保：
     - 样式能被 Shadow 内的 blocksuite CSS 命中
     - 不污染全局 DOM/样式/交互

4. **上游副作用补丁（关键）**
   blocksuite 0.22.4 中发现多处直接写 `document.body.style.*`：
   - `@blocksuite/affine-block-table`: 表格行/列拖拽会设置 `document.body.style.pointerEvents = 'none'`
   - `@blocksuite/affine-inline-link`: 链接弹窗会设置 `document.body.style.overflow = 'hidden'`
   - `@blocksuite/data-view`: 拖拽会设置 `document.body.style.cursor = ...`

   这些行为在 AFFiNE 自身项目中问题不大（因为整站都是 blocksuite），但在“嵌入式编辑器”场景会影响同页其它 UI。

   方案：使用 pnpm patchedDependencies 将上述写入重定向到“事件/组件所在的 ShadowHost（或其局部容器）”，并保留无 Shadow 时的 fallback（继续写 body，保证兼容）。

## 架构决策 ADR

### ADR-001: 采用 Shadow DOM + 最小上游补丁（采纳）
**上下文:** 需要让 blocksuite 在嵌入页面内运行时不影响同页其它 UI，同时避免加载期间全局样式闪烁。
**决策:** 使用 ShadowRoot 承载 blocksuite DOM 与 CSS；用隔离器捕获/迁移样式与 portal；对上游 `document.body.style.*` 做最小补丁改为作用于 ShadowHost。
**理由:**
- 隔离粒度足够强（CSS 与交互副作用都可限制在编辑器范围）
- 改动集中在 blocksuite 集成层，业务层调用方式保持不变
- 补丁范围可控，且通过 pnpm patchedDependencies 可复现与可维护
**替代方案:** Iframe 隔离 → 拒绝原因: 实现与通信成本更高（编辑器交互、快捷键、主题同步、导航/引用等都需要额外桥接）
**影响:** 需要维护少量 blocksuite 上游补丁；Shadow 内 portal 的定位/层级需关注（通过迁移 portal 与样式一致性规避）

## 安全与性能
- **安全:** 无外部敏感数据处理；补丁不引入新的权限或生产操作风险。
- **性能:** 通过按需注入 Shadow 样式避免全局 CSS 级联重算；对 blocksuite 初始化仍为按需加载（首次进入存在成本，但不再影响站点其它区域）。

## 测试与验证
- 手工回归：
  - 进入空间设置/房间设置/Doc 页面，观察同页其它区域不闪烁、不被禁用点击
  - 在 blocksuite 内触发表格行列拖拽、数据视图拖拽、链接弹窗，确认不会修改全局 body 样式
- 代码级验证：
  - DEV 下可临时打印/断点 `document.body.style.pointerEvents/overflow/cursor` 变化来源（不提交日志到生产）

