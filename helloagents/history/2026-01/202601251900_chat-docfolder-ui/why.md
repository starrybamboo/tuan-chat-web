# why

## 目标

- 在 Chat 中为每个用户提供“Space 内私有文档夹”，用于存放个人 Blocksuite 文档
- 与现有“线索/先攻/地图”相同的交互入口：右侧抽屉（side drawer）

## 背景与约束

- 文档内容存储走 Blocksuite 远端快照 `/blocksuite/doc`
- 文档夹结构与“sidebar tree”类似，后端存储为 JSON，并通过 version 做乐观锁
