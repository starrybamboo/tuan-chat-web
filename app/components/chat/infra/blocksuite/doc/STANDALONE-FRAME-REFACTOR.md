# BlockSuite 独立 Frame 重构说明

本文档记录 2026-03 这一轮 BlockSuite 冷启动重构。目标不是继续在现有 route 方案上做 hover/idle 预热补丁，而是把 iframe 编辑器改成一个**独立前端子应用**，让启动方式更接近 AFFiNE 的静态装配模式。

## 1. 背景与问题

重构前，BlockSuite iframe 仍然挂在 React Router 路由链上，导致冷启动成本被叠在“打开文档”这一刻：

- route 先进入 `/blocksuite-frame`
- 再执行 browser-only / SSR-safe 包装
- 再动态加载样式文本
- 再动态加载大量 `@blocksuite/*` / `@toeverything/*` 模块
- 再手工执行 `effects()` / custom element 注册
- 最后才创建 workspace/doc/store/editor

这带来几个直接问题：

- 首次打开文档非常慢
- 运行时样式注入和模块注册都发生在文档打开前
- 需要维护一批只为“避免 route 被非浏览器环境求值”而存在的 wrapper
- 冷启动优化只能依赖很脆弱的临场预热

这轮重构的方向是：

- 保留 iframe 作为样式和运行时隔离边界
- 但把 iframe 页面变成真正的独立客户端入口
- 把样式、core modules、effects 注册前移为子应用启动时的静态工作

## 2. 文件级改动

### 2.1 新增：独立 iframe 子应用入口

- `blocksuite-frame/index.html`
  - 新增独立 html 入口
  - 作用：让 iframe 不再复用主应用 route html，而是拥有自己的最小入口文档

- `app/blocksuite-frame/main.tsx`
  - 新增独立 client entry
  - 作用：挂载 frame 子应用 React 根节点，加载 `app.css` / `animation.css`，启动真正的 frame app

### 2.2 新增：浏览器专用 bootstrap 与静态 runtime 子图

- `app/components/chat/infra/blocksuite/bootstrap/browser.ts`
  - 新增浏览器 bootstrap
  - 作用：
    - 静态引入 `@toeverything/theme/style.css`
    - 静态引入 `@toeverything/theme/fonts.css`
    - 静态引入 `katex/dist/katex.min.css`
    - 静态引入本地 `tcHeader.css` / `affine-embed-synced-doc-header.css`
    - 执行一次性的 runtime 初始化
  - 这一层替代了旧的运行时样式注入方案

- `app/components/chat/infra/blocksuite/spec/coreElements.browser.ts`
  - 新增浏览器版 core elements 注册模块
  - 作用：
    - 顶层静态 import BlockSuite/AFFiNE 依赖
    - 一次性执行 `effects()`
    - 一次性注册 custom elements
  - 这一层替代了旧的 `coreElements.ts` 动态加载器

- `app/components/chat/infra/blocksuite/runtime/runtimeLoader.browser.ts`
  - 新增浏览器版 runtime loader
  - 作用：
    - 静态组合 `spaceWorkspaceRegistry`
    - 暴露 `loadBlocksuiteRuntime()`
    - 不再负责动态 import 关键模块

- `app/components/chat/infra/blocksuite/editors/createBlocksuiteEditor.browser.ts`
  - 新增浏览器版 editor 创建层
  - 作用：
    - 直接静态依赖 `createEmbeddedAffineEditor.client`
    - 不再保留 SSR-safe wrapper 那层延迟 import

### 2.3 新增：frame 子应用 React 壳

- `app/components/chat/infra/blocksuite/frame/BlocksuiteStandaloneFrameApp.tsx`
  - 新增 frame 子应用入口组件
  - 作用：
    - 解析 query params
    - 启动 browser runtime
    - 建立和宿主的 `postMessage` 协议
    - 处理主题同步、高度回传、模式同步

- `app/components/chat/infra/blocksuite/frame/BlocksuiteDescriptionEditorRuntime.browser.tsx`
  - 从宿主组件文件中迁出真正的编辑器运行时组件
  - 作用：
    - 获取 workspace/doc/store
    - 等待 hydration / 恢复
    - 创建 editor
    - 处理 tcHeader、模式切换、只读等编辑器内逻辑
  - 迁出后，宿主不再携带整块编辑器 runtime 实现

### 2.4 修改：宿主 iframe 只做桥接

- `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - 改动点：
    - iframe `src` 改为独立入口
    - 宿主保留参数同步、主题同步、高度同步、mention/fullscreen 外层 UI
    - 不再承担 frame runtime bootstrap
  - 这一步让宿主真正收缩成“iframe host”

### 2.5 修改：旧 route 退化为兼容跳转

- `app/routes/blocksuiteFrame.tsx`
  - 改动点：
    - 不再 import 真实 runtime/editor
    - 只负责兼容旧 URL，跳转到新的独立入口
  - 这一步切断了“通过 route 承载真正编辑器 runtime”的旧路径

### 2.6 修改：Vite 支持独立入口

- `vite.config.ts`
  - 改动点：
    - 增加 `build.rollupOptions.input`
    - 增加 dev 中间件，直接返回 `blocksuite-frame/index.html`
    - 调整 warmup 清单，指向新的 frame 子图
    - 给独立 html 注入 React Router/Vite 的 HMR preamble
  - 这一步让独立入口在开发态和构建态都能被正确识别

### 2.7 删除：旧的动态 runtime 链路

- 删除 `app/components/chat/infra/blocksuite/bootstrap/runtime.ts`
  - 原作用：动态加载样式文本、动态加载 core modules、在 iframe 内执行 bootstrap

- 删除 `app/components/chat/infra/blocksuite/styles/ensureBlocksuiteRuntimeStyles.ts`
  - 原作用：在运行时拼接和注入完整 BlockSuite/AFFiNE CSS

- 删除 `app/components/chat/infra/blocksuite/spec/coreElements.ts`
  - 原作用：为了 SSR-safe，在运行时动态 import 大量模块并手工执行 `effects()`

- 删除 `app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.ts`
  - 原作用：仅为了 SSR-safe 保留的一层动态 wrapper

这些删除的共同意义是：

- 正式路径不再依赖“打开文档时临时拼 runtime”

### 2.8 修改：文档同步

- `app/components/chat/infra/blocksuite/doc/LEARNING-PATH.md`
- `app/components/chat/infra/blocksuite/doc/TROUBLESHOOTING.md`

更新原因：

- 启动链从 `bootstrap/runtime.ts + ensureBlocksuiteRuntimeStyles.ts + coreElements.ts`
  改成了
  `browser.ts + coreElements.browser.ts + 独立 frame entry`

## 3. 改造前后的启动链

### 3.1 改造前

宿主页面打开文档：

1. 宿主 iframe 指向 `/blocksuite-frame`
2. React Router route 启动 frame 页面
3. route 内运行 `ensureBlocksuiteRuntimeReady()`
4. 动态 import 样式文本
5. 动态 import 大量 BlockSuite/AFFiNE 模块
6. 执行 `effects()` / custom element 注册
7. 动态 import runtime/editor wrapper
8. 创建 workspace/doc/store/editor
9. 文档显示

特点：

- 冷启动成本全部压在“首次打开文档”
- 路由链、SSR-safe 包装、运行时样式注入、动态 import 全都叠在一起

### 3.2 改造后

宿主页面打开文档：

1. 宿主 iframe 指向 `/blocksuite-frame/index.html`
2. Vite/构建产物直接返回独立 html
3. `app/blocksuite-frame/main.tsx` 启动 frame 子应用
4. `browser.ts` 静态引入样式
5. `coreElements.browser.ts` 静态装配 core modules 与 effects
6. `BlocksuiteStandaloneFrameApp.tsx` 初始化 frame 协议与状态
7. `BlocksuiteDescriptionEditorRuntime.browser.tsx` 创建 workspace/doc/store/editor
8. 文档显示

特点：

- frame 更像一个正式的独立客户端子应用
- 样式和 runtime 不再通过运行时字符串注入和大块动态 import 完成
- 文档打开时主要只剩数据恢复和 editor 创建

## 4. 中途踩到的问题与修复

### 4.1 iframe 一直 loading，`/blocksuite-frame/index.html` 404

原因：

- 开发态没有真正把独立 `index.html` 作为 iframe 页面吐出来
- 请求回落到主应用 route，导致 404 和 `No routes matched`

修复：

- 在 `vite.config.ts` 新增 dev middleware
- 直接把 `blocksuite-frame/index.html` 作为独立入口返回

### 4.2 `React Router Vite plugin can't detect preamble`

原因：

- 独立 html 虽然能返回，但没有带 React Router/Vite 在 dev 下要求的 HMR preamble
- 所有被 React Router Vite 插件包装过的 TSX 模块一执行就报错

修复：

- 在 `vite.config.ts` 给独立 html 注入：
  - `virtual:react-router/inject-hmr-runtime`

### 4.3 iframe 持续刷 sandbox 警告

原因：

- `sandbox="allow-scripts allow-same-origin"` 并不提供真正安全隔离
- 只会制造重复警告和误导

修复：

- 从 iframe 宿主上移除这一组无效 sandbox 配置

## 5. 这轮重构的实际收益

结构层面：

- 宿主只做 iframe host
- frame 成为独立子应用
- runtime 样式和 core/effects 注册前移为静态启动工作
- 旧 route runtime 路径退出正式链路

冷启动层面：

- 不再需要在首次打开文档时动态注入完整样式
- 不再需要在首次打开文档时通过旧 `coreElements.ts` 动态拉一批核心模块
- 不再需要 route 级 runtime bootstrap

## 6. 仍然保留的问题边界

这轮解决的是**冷启动结构性成本**，不是所有性能问题：

- iframe 高度测量本身仍然存在
- `SpaceWorkspace` 的生命周期与同步职责仍未继续拆解
- 大文档的 Yjs update 应用、store 创建、editor 渲染成本依然存在

也就是说，这轮优化的是：

- “启动方式”

不是：

- “文档本体渲染复杂度”

## 7. 后续建议

下一阶段建议按这个顺序继续：

1. 用 Network/Performance 面板对比 frame 首开 waterfall，验证静态入口是否显著减少动态 wrapper 请求
2. 继续测量 `frame bootstrap` 和 `editor ready` 的真实耗时变化
3. 如果冷启动仍然偏大，再拆 `coreElements.browser.ts`，把最重的域按能力进一步分组
4. 最后再考虑是否要继续压缩 iframe 高度同步这类运行期开销
