# BlockSuite Boundary 相对 dev 的改动与效果

本文档只回答一件事：

**历史上的 `boundary` 实验分支，相对 `dev` 分支到底改了什么，以及这些改动为什么让冷启动更快。**

这里不展开已经试过又撤掉的 standalone 独立 html 方案，只看最后保留下来的净结果。

---

## 1. 结论

相对当时的 `dev`，`boundary` 方案可以视为一次**纯优化**：

- 业务入口仍然是 `/blocksuite-frame` React Router 路由
- 不需要独立 html 入口，也不需要额外 dev middleware
- 旧 route 方案里最重的 runtime bootstrap 基本被消掉了
- 冷启动总耗时在当前样本下从 `10496ms` 降到 `8302ms`

按当前对比样本：

- `dev totalMs`: `10496ms`
- `boundary totalMs`: `8302ms`
- 减少 `2194ms`
- 约快 `20.9%`

---

## 2. boundary 相对 dev 的净改动

### 2.1 `/blocksuite-frame` 从“重路由页面”改成“轻量壳 + 单一 client chunk”

相关文件：

- [`/Users/chxr/Projects/tuan-chat-web/app/routes/blocksuiteFrame.tsx`](/Users/chxr/Projects/tuan-chat-web/app/routes/blocksuiteFrame.tsx)
- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/BlocksuiteRouteFrameClient.tsx`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/BlocksuiteRouteFrameClient.tsx)

`dev` 里的 `/blocksuite-frame` 会直接承载较重的运行时装配。

`boundary` 当时把路由收敛成轻量壳，并把真正的 BlockSuite 客户端逻辑放进单一 browser-only client chunk。

这一步的意义是：

- 不再把 BlockSuite 的大块浏览器专用装配散落在多个运行时动态入口里
- 也不需要再引入独立 html 子应用

### 2.2 运行时启动改成静态浏览器子图

相关文件：

- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/bootstrap/browser.ts`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/bootstrap/browser.ts)
- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/spec/coreElements.browser.ts`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/spec/coreElements.browser.ts)
- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/runtime/runtimeLoader.browser.ts`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/runtime/runtimeLoader.browser.ts)
- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.browser.ts`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.browser.ts)
- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/BlocksuiteDescriptionEditorRuntime.browser.tsx`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/BlocksuiteDescriptionEditorRuntime.browser.tsx)

这里是这次优化真正起作用的部分。

`dev` 的旧链路更接近：

- 打开文档
- 动态注入运行时样式
- 动态加载 core modules
- 动态执行 `effects()` / custom elements 注册
- 再创建 runtime / editor

`boundary` 的新链路是：

- 路由只负责切进一个 browser-only chunk
- chunk 内用静态 import 带入 CSS、core modules、effects、runtime、editor
- 文档真正打开时，只剩 store/doc/editor 初始化

直接效果是：

- 旧的 `frameBootstrapMs` 基本被打掉
- `editorReadyMs` 也随之下降

### 2.3 宿主侧收回成纯 iframe host

相关文件：

- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.tsx)

相对 `dev`，这个文件最大的变化是：

- 只保留 iframe 宿主职责
- 不再在宿主内跑旧的 Blocksuite runtime 启动链
- 宿主只做：
  - iframe URL 参数
  - `postMessage`
  - 主题同步
  - mention popover
  - loading skeleton

这让“宿主”和“编辑器运行时”边界更清楚。

### 2.4 清掉旧的动态启动链

相对 `dev`，以下旧链路已经不再是主路径：

- `app/components/chat/infra/blocksuite/bootstrap/runtime.ts`
- `app/components/chat/infra/blocksuite/spec/coreElements.ts`
- `app/components/chat/infra/blocksuite/styles/ensureBlocksuiteRuntimeStyles.ts`
- `app/components/chat/infra/blocksuite/runtime/runtimeLoader.ts`
- `app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.ts`
- `app/components/chat/infra/blocksuite/docOpenIntentPrewarm.ts`

这些文件代表的是旧方案：

- 多段动态启动
- 运行时样式拼接注入
- 无效的临场 prewarm

这些内容是历史优化上下文，不代表当前仓库里仍然保留这些旧文件。

### 2.5 其它配套修正

相关文件：

- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/editors/tcAffineEditorContainer.ts`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/editors/tcAffineEditorContainer.ts)
- [`/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/shared/perf.ts`](/Users/chxr/Projects/tuan-chat-web/app/components/chat/infra/blocksuite/shared/perf.ts)

这两类改动分别解决：

- `doc.root` 尚未 ready 时的 `null.id` 崩溃
- 冷启动链路的统一量化与控制台输出

---

## 3. 为什么 boundary 比 dev 快

核心不是“换成 iframe”或者“换成 route”，而是：

**把旧 route 方案里那条很重的临时运行时启动链，改成了单一 browser-only client chunk 的静态装配。**

所以收益主要来自：

- 不再动态注入完整运行时样式
- 不再走旧的 `coreElements.ts` Promise.all 动态加载链
- 不再在文档打开时临时补一轮 `effects()` / custom elements 注册
- 不再依赖临场 prewarm

---

## 4. 量化结果（当前样本）

同一类文档、同一环境下，当前测到的三组结果：

### 4.1 boundary

- `totalMs`: `8302.0ms`
- `frameEntryDelayMs`: `7753.6ms`
- `frameAppMountMs`: `147.4ms`
- `frameBootstrapMs`: `0.2ms`
- `editorReadyMs`: `400.7ms`

### 4.2 standalone

- `totalMs`: `8322.8ms`
- `frameEntryDelayMs`: `7842.8ms`
- `frameAppMountMs`: `82.5ms`
- `frameBootstrapMs`: `0.2ms`
- `editorReadyMs`: `397.3ms`

### 4.3 dev

- `totalMs`: `10496ms`
- `frameBootstrapMs`: `4335ms`
- `editorReadyMs`: `1371ms`

### 4.4 解释

从这组数据可以直接看出：

- `boundary` 和 `standalone` 基本等价
- 相对 `dev`，`boundary` 已经拿到了几乎全部需要的冷启动收益
- 原来最重的部分是 `dev` 的 `frameBootstrapMs`
- 现在最大的剩余瓶颈已经变成：
  - `host-open-start -> frame-entry-start`

也就是说，当前剩余问题已经不是旧的动态 runtime bootstrap，而是 route client chunk 真正开始执行之前的那一大段入口加载成本。

---

## 5. 当前判断

基于这组历史结果，可以把 `boundary` 相对当时的 `dev` 视为一次纯优化：

- 冷启动更快
- 工程复杂度低于 standalone 独立 html 方案
- 业务入口仍然维持 `/blocksuite-frame`
- 不需要额外保留一套 standalone 正式路径

按这份历史样本，当时后续优化重点不再是“route 还是 standalone”，而应该转向：

- `frameEntryDelayMs`
- route client chunk 的模块体量与碎片化
- dev 首次 transform / 首次求值成本
