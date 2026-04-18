# Blocksuite 集成

## 当前约定

团剧共创前端通过 `package.json` 中的 `@blocksuite/*`、`@blocksuite/affine*` 和 `@toeverything/theme` 依赖集成编辑器能力，业务代码主要位于 `app/components/chat/infra/blocksuite/`。

本仓库不直接内嵌 AFFiNE 或 OctoBase 源码。自 2026-04-18 起，相关外部参考仓库统一迁移到 `D:\A_blocksuite`，避免继续占用 `D:\A_collection` 根目录。

## 外部参考仓库

- `D:\A_blocksuite\AFFiNE`
  - 参考 AFFiNE 产品层实现，以及仓库内 `blocksuite/` 子目录的编辑器源码。
- `D:\A_blocksuite\OctoBase`
  - 参考 AFFiNE 相关的 local-first 协作、同步和存储实现。

详细路径、推荐入口和查阅建议见 [../vendors/blocksuite/index.md](../vendors/blocksuite/index.md)。

## 查阅建议

- 编辑器 UI、块模型、slash menu、widgets、样式行为：优先看 `D:\A_blocksuite\AFFiNE\blocksuite\`。
- AFFiNE 产品层集成方式：优先看 `D:\A_blocksuite\AFFiNE\packages\frontend\`。
- 协作同步、云端接口、存储抽象：优先看 `D:\A_blocksuite\OctoBase\apps\cloud\`、`D:\A_blocksuite\OctoBase\apps\keck\` 和 `D:\A_blocksuite\OctoBase\libs\`。

## 注意

- 这两个仓库当前仅作为团剧共创的参考实现，不作为本仓库的直接构建依赖。
- 如果外部参考仓库路径再次调整，需要同步更新本页和 `docs/vendors/blocksuite/index.md`。
