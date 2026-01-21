# Blocksuite Playground 移植教学指南（tuan-chat-web）

本文档面向“把 BlockSuite/AFFiNE 官方 playground（或 blocksuite-examples）嵌入到 tuan-chat-web”这一类工作，总结**关键概念**与**必须遵守的迁移注意事项**。

适用范围：
- 你在本项目中看到的 `/blocksuite-playground`（starter app）
- 从 blocksuite-examples、AFFiNE Playground 迁移代码

相关背景/修复记录（偏操作与故障回溯）：
- Vite/依赖/语法兼容修复记录：见 [docs/2026-01-06_blocksuite-playground-dev-fixes.md](../../../../../../docs/2026-01-06_blocksuite-playground-dev-fixes.md)

---

## 1. 先记住一句话：BlockSuite 必须“单实例”

BlockSuite 生态里有大量依赖“运行时身份”的逻辑：
- `instanceof`（例如 `Text`/`Boxed`）
- DI token（Service/Extension 的标识）

只要你的 bundle 里出现 **同一个包的两个物理副本**（哪怕版本号相同），就会出现非常诡异的崩溃：
- `Error: Unexpected content type`（Yjs 不接受某些值）
- `ServiceNotFoundError: Service [xxx] not found in container`（DI token 对不上）
- `BlockSuiteError: Property store is invalid ...`（store 类型校验失败）

这些报错通常不是“业务逻辑写错了”，而是**模块图里有重复实例**。

---

## 2. 核心包与 AFFiNE 包：不要混淆

### 2.1 核心包（不要在中间加 `/affine`）

下面 4 个包是 BlockSuite 的“地基”，它们本身就是顶层包名：
- `@blocksuite/global`
- `@blocksuite/store`
- `@blocksuite/std`
- `@blocksuite/sync`

它们不属于 `@blocksuite/affine-*` 家族，因此**不应该**写成任何类似：
- `@blocksuite/affine/global`（不存在）
- `@blocksuite/affine/store`（这是另外一个概念，见下节）
- “在 import 路径中间加 `/affine`”来“猜”路径（极易引入重复实例/错误入口）

你应该做的是：
- 通过 Vite 配置把这 4 个包强制单实例（`resolve.dedupe` + alias 到同一物理路径）

### 2.2 AFFiNE 包（提供 Affine 风格 blocks/spec/widgets）

`@blocksuite/affine` 以及 `@blocksuite/affine-*` 系列，提供的是 Affine 风格页面需要的：
- schema / blocks / widgets / services
- 一套现成的 “page + edgeless” 体验

这类包才是“affine 家族”。

### 2.3 关于 `@blocksuite/affine/store`

`@blocksuite/affine/store` 是 **`@blocksuite/affine` 包对外暴露的一个子路径 export**（subpath export）。

它在使用体验上通常表现为：
- “看起来像是 `store` 的某种聚合/再导出入口”
- 可能会再导出 `Text` / `Boxed` / `native2Y` / `nanoid` 等便利能力

但关键点在于：
- `@blocksuite/store` 与 `@blocksuite/affine/store` **不是同一个模块入口**。
- 一旦你的代码同时从两个入口拿到“名字相同的类/函数”，就要非常警惕是否会造成**不同构造器实例**。

经验原则（迁移时最稳的做法）：
- **要么全套沿用官方 playground 的入口组合**，保证所有相关符号来自同一条依赖链。
- **要么在本项目里明确规定“数据层/CRDT 相关只用 `@blocksuite/store`”**，并保证渲染/扩展侧不会再从别的入口拿到第二份 store 实现。

---

## 3. 典型崩溃与根因对照表

### 3.1 `Error: Unexpected content type`（Yjs）

高概率根因：`native2Y` 没有把值转换成 Yjs 支持的类型。

一个最常见的触发链路：
- `DocCRUD.addBlock` 会把 block props 写进 `Y.Map`
- 写入前会执行 `native2Y(value)`
- `native2Y` 内部对 `Text`/`Boxed` 这类特殊类型做 `instanceof` 判断

当你创建的 `Text` 来自“另一份模块实例”（例如 `TextA !== TextB`）：
- `value instanceof Text` 失败
- `native2Y` 把它当普通对象/未知对象
- Yjs 在 `Y.Map.set()` 时拒绝该值类型，抛出 `Unexpected content type`

**结论：** 这不是“Yjs 坏了”，而是“你的 `Text` 不是 store 认识的那份 `Text`”。

### 3.2 `ServiceNotFoundError: Service [_StoreSelectionExtension...] not found in container`

高概率根因：DI token（Service 标识）来自不同模块实例。

现象上看像“没注册 extension”，但实际上是：
- 你注册的是 `TokenA`
- 你获取的是 `TokenB`
- 名字可能一样，但引用不是同一个

**结论：** 这通常是 `@blocksuite/*`（或其子路径）出现重复实例导致。

### 3.3 `BlockSuiteError: Property store is invalid ...`

高概率根因：运行时对 store/host 的类型校验失败（依赖同一个构造器/原型链）。

**结论：** 依然优先排查“重复实例”而不是 UI 代码。

---

## 4. Vite 下避免重复实例：我们项目的落地规则

本项目（tuan-chat-web）相比官方 playground 多了两点复杂性：
- React Router dev 会用 SSR 加载 route modules（Node 侧执行）
- pnpm + monorepo/软链接在 Windows 下更容易出现“同包不同物理路径”

因此我们采用以下组合策略（见项目根配置）：
- `resolve.dedupe`：把 `@blocksuite/global|store|std|sync`、`yjs` 等强制去重
- `resolve.alias`：把关键 `@blocksuite/*` 指向 **同一份 dist 物理路径**（避免 src/dist 混用）
- `optimizeDeps.exclude`：**不要预打包 blocksuite/affine 家族**，避免被强制塞进 deps chunk 后出现第二份模块图
- `ssr.noExternal`：SSR 侧强制 bundle/transpile `@blocksuite/*`（避免 Node 直接执行上游 TS 源码）

你在 [vite.config.ts](../../../../../../vite.config.ts) 里看到的：
- `resolve.dedupe` 包含：`@blocksuite/global`、`@blocksuite/store`、`@blocksuite/std`、`@blocksuite/sync`
- 它们 **就是正确的**，也正如你说的：这几个不需要也不应该“在中间加 `/affine`”。

---

## 5. 迁移 Checklist（照着做，能少踩 80% 的坑）

### 5.1 导入规范

- 不要“猜路径”：不要为了“看起来统一”而发明诸如 `@blocksuite/affine/global` 这类路径。
- 避免深层导入 `src/*`：迁移时优先走包的稳定导出（必要时通过 Vite alias 强制到 `dist`）。
- 对 `Text/Boxed/native2Y` 这类“数据层关键类型”：
  - 保证它们与 store 写入路径使用的是同一份模块实例。

### 5.2 Vite 配置规范（强制单实例）

- `resolve.dedupe` 必须覆盖：
  - `yjs`
  - `@blocksuite/global`、`@blocksuite/store`、`@blocksuite/std`、`@blocksuite/sync`
  - 以及项目实际用到的 `@blocksuite/affine*` 家族包（防止被嵌套重复加载）
- `optimizeDeps.exclude` 必须包含 blocksuite/affine 家族（避免预打包造成重复模块图）。

### 5.3 SSR（React Router dev）注意事项

- route module 在 dev 会被 SSR 加载。
- 上游若导出 TS 源码或新语法，Node 侧会直接炸。
- 因此需要 `ssr.noExternal` 把 `@blocksuite/*` 打进 SSR bundle。

---

## 6. 快速自检：如何判断“你是不是又有重复实例了”

当你再次看到以下任意一种错误时：
- `Unexpected content type`
- `ServiceNotFoundError`
- `store is invalid`

优先做这三件事（按收益排序）：
1) 检查 Vite 的 `resolve.alias` 是否把同一个包指向了两套路径（src/dist 混用、或真实路径不一致）
2) 检查 `resolve.dedupe` 是否遗漏了关键包（尤其是 `yjs` 与四大核心包）
3) 检查 `optimizeDeps` 是否把 `@blocksuite/*` 预打包进了 deps chunk（容易生成第二份模块图）

---

## 7. 推荐阅读

- Blocksuite 集成概览：见 `app/components/chat/infra/blocksuite/doc/README.md`
- 常见 UI/交互问题：见 `app/components/chat/infra/blocksuite/doc/TROUBLESHOOTING.md`
- 本次 Vite/依赖修复记录：见 [docs/2026-01-06_blocksuite-playground-dev-fixes.md](../../../../../../docs/2026-01-06_blocksuite-playground-dev-fixes.md)

---

## 8. 本项目路由说明：/doc-test 已彻底替换为 playground

为了避免“doc-test 一套、playground 一套”的分裂，本项目已将 `/doc-test` 直接改为挂载 starter playground。

- 代码位置： [app/routes/docTest.tsx](../../../../../../app/routes/docTest.tsx)
- 相关路由： [app/routes/blocksuitePlayground.tsx](../../../../../../app/routes/blocksuitePlayground.tsx)

### 8.1 为什么这么做

- 降低维护成本：只保留一套 starter 初始化链路（collection + editor container + services/extensions）。
- 避免单实例问题被“两个入口”放大：两个入口越多，越容易出现重复 import / HMR 复用导致的 DI token 与 `instanceof` 断裂。

### 8.2 回滚指引（如果你需要恢复旧的 IndexedDB 文档测试页）

如果后续仍需要“本地 IndexedDB 持久化 doc-test”，建议用新路由（例如 `/doc-test-persist`）恢复旧实现，而不是在 `/doc-test` 内做参数分支。

最小回滚做法：
- 新建一个路由文件（例如 `app/routes/docTestPersist.tsx`），把旧版 `docTest.tsx` 中 `BlocksuiteDescriptionEditor` 的实现移过去。
- 保持 `/doc-test` 继续指向 playground，避免又出现两套入口相互影响。
