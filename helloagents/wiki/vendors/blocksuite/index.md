# Blocksuite（@blocksuite/*）依赖文档（本项目）

> 目的：把“这个包/子路径是干什么的、我该从哪里导入、怎么定位到源码文件”变成可查阅的项目知识库内容。

---

## 1. 版本与范围

本项目在 `package.json` 中锁定以下 9 个包版本为 `0.22.4`：
- `@blocksuite/affine`
- `@blocksuite/affine-components`
- `@blocksuite/affine-model`
- `@blocksuite/affine-shared`
- `@blocksuite/global`
- `@blocksuite/integration-test`
- `@blocksuite/std`
- `@blocksuite/store`
- `@blocksuite/sync`

本系列文档聚焦“以上 9 个包本身的导入入口与能力边界”，并在需要时指出它们与本项目已使用的 `@blocksuite/affine-block-*`、`@blocksuite/affine-inline-*`、`@blocksuite/affine-widget-*` 等子包的关系。

---

## 2. 快速查阅路线（强烈推荐）

当你想“用 Blocksuite 做某个能力”时，建议按这个顺序定位：

1. **先找项目内已有用法（可运行的事实来源）**
   - 入口目录：`app/components/chat/infra/blocksuite/`
   - 关键文件：`app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
   - playground：`app/components/chat/infra/blocksuite/playground/apps/starter/`

2. **再确认导入子路径属于哪个包**
   - 例如：`@blocksuite/affine/store`、`@blocksuite/affine/shared/services`、`@blocksuite/std/gfx`

3. **用 `exports` 定位到 node_modules 的源码文件**
   - 规则：查看 `node_modules/@blocksuite/<pkg>/package.json` 的 `exports`
   - 现状：本项目环境下，部分包的 `exports` 可能直接指向 `src/*.ts`

4. **需要稳定构建时，再关注 `dist/`**
   - 许多包同时提供 `dist/`（编译产物）与 `src/`（源码），本项目已存在针对 Blocksuite 的构建兼容处理文档与实践（见下方“项目内相关文档”）。

---

## 3. 包导航

- [`@blocksuite/affine`](affine.md)
- [`@blocksuite/affine-components`](affine-components.md)
- [`@blocksuite/affine-model`](affine-model.md)
- [`@blocksuite/affine-shared`](affine-shared.md)
- [`@blocksuite/global`](global.md)
- [`@blocksuite/std`](std.md)
- [`@blocksuite/store`](store.md)
- [`@blocksuite/sync`](sync.md)
- [`@blocksuite/integration-test`](integration-test.md)

---

## 4. 项目内相关文档（补充阅读）

以下是“本项目自己的 Blocksuite 集成文档/记录”，用于理解为什么要这样集成、以及遇到构建/运行问题时如何排查：

- `app/components/chat/infra/blocksuite/doc/`
- `docs/BLOCKSUITE_EXAMPLES_STUDY_AND_ADAPTATION_2026-01-04.md`
- `docs/BLOCKSUITE_EDITOR_REQUIREMENTS_AND_WRAPPERS_2026-01-04.md`
- `docs/2026-01-06_blocksuite-playground-dev-fixes.md`
- `docs/2026-01-07_electron_build_fixes.md`

