# Blocksuite Docs Architecture

## 路径

`app/components/chat/infra/blocksuite/doc/`

## 目标

保存 Blocksuite 集成相关的长期文档，而不是运行时代码。

## 当前文档

- `README.md`：总入口
- `DIRECTORY.md`：目录字典与索引
- `BUSINESS.md`：业务语义
- `INTERNAL-DATA.md`：内部数据结构
- `LEARNING-PATH.md`：学习路线
- `TROUBLESHOOTING.md`：排障指南
- `BOUNDARY-UPDATE.md`：边界更新说明
- `architecture/*.md`：各子目录架构文档

## 维护约束

- 文档目录不放运行时代码
- 新增子域说明时，优先补到 `architecture/`
- 目录变更后，先更新 `DIRECTORY.md`
