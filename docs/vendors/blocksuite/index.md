# Blocksuite 参考仓库

## 说明

自 2026-04-18 起，团剧共创使用的 Blocksuite 参考仓库统一存放在 `D:\A_blocksuite`：

- `D:\A_blocksuite\AFFiNE`
- `D:\A_blocksuite\OctoBase`

这样做的目的，是把团剧共创业务仓库和上游参考仓库分开管理，避免继续把第三方大型仓库堆在 `D:\A_collection` 根目录。

## 仓库用途

### AFFiNE

- 路径：`D:\A_blocksuite\AFFiNE`
- 用途：AFFiNE 主仓库，包含产品层实现，以及仓库内 `blocksuite/` 子目录的编辑器源码。
- 推荐入口：
  - `D:\A_blocksuite\AFFiNE\blocksuite\affine`
  - `D:\A_blocksuite\AFFiNE\blocksuite\docs`
  - `D:\A_blocksuite\AFFiNE\packages\frontend`

### OctoBase

- 路径：`D:\A_blocksuite\OctoBase`
- 用途：AFFiNE 使用的 local-first 协作数据层参考实现，适合对照同步、存储和云端协作设计。
- 推荐入口：
  - `D:\A_blocksuite\OctoBase\apps\cloud`
  - `D:\A_blocksuite\OctoBase\apps\keck`
  - `D:\A_blocksuite\OctoBase\libs`

## 与团剧共创的对应关系

- 团剧共创前端 Blocksuite 业务代码：`app/components/chat/infra/blocksuite/`
- 当前 npm 依赖版本记录：`package.json` 中的 `@blocksuite/*`、`@blocksuite/affine*` 和 `@toeverything/theme`

## 使用建议

- 看编辑器 UI、块定义、扩展点和交互实现时，优先从 AFFiNE 开始。
- 看协作同步、云端接口和底层存储模型时，优先从 OctoBase 开始。
- 需要引用这些仓库时，统一写 `D:\A_blocksuite\...`，不要继续写旧路径 `D:\A_collection\AFFiNE` 或 `D:\A_collection\OctoBase`。
