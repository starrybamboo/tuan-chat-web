# Blocksuite 集成豆知识 / 常见坑（本项目）

> 目的：把排查过程中确认过的“行为真相 + 正确用法 + 典型坑位”记录下来，避免重复踩坑。

---

## 1. `mention` 是 embed 节点：不要把 `@显示名` 当成 mention 插入

### 现象
- 选择一次候选项后，编辑器里出现 `@鸠 @鸠 @鸠 ...` 这种“像是插入了很多次”的结果。
- 但实际并不一定是 action 被触发了很多次，也可能只是渲染层把同一次插入“重复渲染”了。

### 根因（Blocksuite 机制）
- `mention` inline spec 在 Blocksuite 中是 **embed 节点**（`embed: true`）。
- embed 节点在文本模型里应该对应 **单个占位字符**（`ZERO_WIDTH_FOR_EMBED_NODE`），并在该字符上携带属性（例如 `mention.member`）。
- 如果把多字符文本（例如 `@Alice`）整体插入，并同时挂 `mention` 属性：
  - 渲染层可能把 **每个字符**都识别为 mention delta 并渲染为完整 mention 组件；
  - 结果就是“一次插入显示成多次提及”。

### 正确做法（本项目最终实现）
- 用 `inlineEditor.insertText(range, ZERO_WIDTH_FOR_EMBED_NODE, { mention: { member: id } })` 插入 embed 节点；
- 再额外插入一个普通空格，光标移动到空格之后，保证继续输入体验。

定位参考：
- inline spec：`node_modules/@blocksuite/affine-inline-mention/src/inline-spec.ts`
- 渲染组件：`node_modules/@blocksuite/affine-inline-mention/src/affine-mention.ts`
- 常量：`node_modules/@blocksuite/std/src/inline/consts.ts`（`ZERO_WIDTH_FOR_EMBED_NODE`）

---

## 2. 本项目里 `@` 弹窗来自 linked-doc widget（`affine-linked-doc-popover`）

### 结论
在当前 Blocksuite 版本（0.22.4）与本项目集成方式下：
- 输入 `@` 打开的弹窗是 **linked-doc widget** 的 popover（`<affine-linked-doc-popover />`），而不是一个“内置的成员 mention picker”。
- 因此“@ 候选项的插入/关闭逻辑”本质上是 linked-doc popover 的 confirm/click → `action()` 链路。

定位参考：
- widget：`node_modules/@blocksuite/affine-widget-linked-doc/src/widget.ts`
- popover：`node_modules/@blocksuite/affine-widget-linked-doc/src/linked-doc-popover.ts`
- keydown 处理：`node_modules/@blocksuite/affine-shared/src/utils/event.ts`（`createKeydownObserver`）

---

## 3. `abort()` 的语义：关闭 popover + 清理 `@query`

linked-doc popover 的 `abort()`（内部实现名为 `_abort`）会：
- `context.close()` 关闭弹窗
- `cleanSpecifiedTail(...)` 清掉触发键 + query（例如 `@` + 已输入过滤词）

因此自定义 action 里要注意顺序：
- 先 `abort()` 清理 `@query` / 关闭 popover；
- 再按正确位置插入目标节点（例如 mention embed）。

---

## 4. 开发环境 `runtime mount` 多次通常是正常现象

在 dev 环境里看到 `[BlocksuiteMentionHost] runtime mount ...` 多次，常见原因包括：
- React StrictMode 的 effect double-invoke（mount → unmount → mount）；
- 路由/iframe 重新加载；
- HMR 触发模块与副作用重跑。

判断是否真的“创建了多个编辑器实例”，应以实际 DOM/iframe 数量、store/docId 生命周期与 cleanup 行为为准，而不是仅凭日志次数。

---

## 5. iframe `sandbox` 的浏览器安全提示：`allow-scripts` + `allow-same-origin`

### 现象
浏览器控制台提示：
> An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.

### 含义（简述）
当同一个 iframe 同时具备：
- 允许脚本执行（`allow-scripts`）
- 且保留同源能力（`allow-same-origin`）

浏览器会认为“sandbox 的隔离效果被大幅削弱”，因此给出安全提示。

### 处理建议（按需求取舍）
- 如果你只想“限制表单/弹窗/导航”等行为，而 iframe 仍需要同源（localStorage/cookie/同源 fetch 等）：保留 `allow-same-origin` 是合理的，但不要把它当作强隔离安全边界。
- 如果你确实需要“强隔离安全边界”：通常不应同时开启 `allow-scripts` 与 `allow-same-origin`，但这会显著限制编辑器能力（需要按实际功能逐项验证）。

---

## 6. React Router 的 `hydrateFallback` 控制台提示

### 现象
控制台提示：
> 💿 Hey developer 👋. You can provide a way better UX than this when your app is loading JS modules and/or running `clientLoader` functions. Check out .../hydratefallback ...

### 含义（简述）
当路由模块懒加载（或 `clientLoader`）发生时，如果没有提供 `hydrateFallback`（或同等的占位 UI），React Router 会在开发环境提示你“可以做更好的加载体验”。

### 本项目建议
- 将“加载占位 UI”作为路由体验的一部分统一设计（尤其是 iframe 场景的 Blocksuite 路由），避免出现“白屏一下”的体感。
- 该提示是开发态建议，不代表线上错误；但它通常对应真实的 UX 空洞点，值得补齐。
