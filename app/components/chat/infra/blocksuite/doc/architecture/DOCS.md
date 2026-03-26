# Blocksuite Docs Architecture

## 路径

- [doc/](../)

## 目标

保存 Blocksuite 集成相关的长期文档，而不是运行时代码。

## 当前文档

- [README.md](../README.md)：总入口
- [DIRECTORY.md](../DIRECTORY.md)：目录字典与索引
- [BUSINESS.md](../BUSINESS.md)：业务语义
- [INTERNAL-DATA.md](../INTERNAL-DATA.md)：内部数据结构
- [LEARNING-PATH.md](../LEARNING-PATH.md)：学习路线
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)：排障指南
- [editor/](../editor)：editor 专题文档
- [frame/](../frame)：frame 专题文档
- [records/](../records)：历史记录
- [architecture/](./)：子目录架构文档

## 维护约束

- 文档目录不放运行时代码
- `architecture/` 只放目录边界文档，不放专题深挖
- editor、frame 这类专题说明优先放到对应子目录
- 记录/阶段性治理文档优先放到 `records/`
- 目录变更后，先更新 [DIRECTORY.md](../DIRECTORY.md)
