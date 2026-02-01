# 为什么要做（Why）

## 背景

项目中大量列表项/入口是“图片 + 标题”的结构。随着更多内容页（如空间/房间/线索描述）逐步向 BlockSuite 文档承载靠拢，原先由业务实体（room/space/clue）承载的“名称/头像”等信息需要与 BlockSuite 的文档显示保持一致。

## 目标

- 打开空间/房间/线索等「描述文档」页面时，不使用 Blocksuite 内置 `doc-title` 标题编辑。
- 用 TuanChat 自己的组件渲染并编辑标题区，支持结构：
  - `[ͼƬ]  标题`
- 以 Blocksuite 为主数据源，业务实体（room/space）仅作为冗余存储。
- 在用户编辑标题/图片时，侧边栏房间/空间列表等位置可乐观显示新标题/头像（无需等待后端返回）。

## 成功标准

- room/space/clue description 文档顶部显示自定义标题条，并且 blocksuite 内置 doc-title 不再出现/不可编辑。
- 标题与图片写入 blocksuite 文档快照（可随远端 snapshot 持久化）。
- room/space 列表在编辑过程中即时显示 blocksuite 标题/头像覆盖值；保存后冗余写回 room/space。

