# tuan-chat-web 知识库

> 本文件是知识库的入口点

## 快速导航

| 需要了解 | 读取文件 |
|---------|---------|
| 项目概况、技术栈、开发约定 | [context.md](context.md) |
| 模块索引 | [modules/_index.md](modules/_index.md) |
| 侧边栏树与素材包相关模块 | [modules/chat-sidebar-tree.md](modules/chat-sidebar-tree.md), [modules/space-detail-routing.md](modules/space-detail-routing.md), [modules/material-library.md](modules/material-library.md) |
| 项目变更历史 | [CHANGELOG.md](CHANGELOG.md) |
| 历史方案索引 | [archive/_index.md](archive/_index.md) |
| 当前待执行的方案 | [plan/](plan/) |

## 模块关键词索引

> AI 读取此表即可判断哪些模块与当前需求相关，按需深读。

| 模块 | 关键词 | 摘要 |
|------|--------|------|
| chat-sidebar-tree | 侧边栏, 分类树, 房间, 文档, 拖拽, schema | 空间左侧侧边栏树的数据结构、归一化、拖拽和分类渲染链路 |
| space-detail-routing | 路由, material, 空间详情, 主内容区 | 聊天页如何在房间、文档、空间详情之间切换，并承载局内素材包工作区 |
| material-library | 素材包, 局内素材包, 局外素材包, 导入, 工作区 | 局内/局外素材包的列表、编辑、导入和详情工作区 |

## 知识库状态

```yaml
kb_version: 2.3.7
最后更新: 2026-03-28 17:22
模块数量: 3
待执行方案: 0
```

## 读取指引

```yaml
启动任务:
  1. 读取本文件获取导航
  2. 读取 context.md 获取项目上下文
  3. 检查 plan/ 是否有进行中方案包

任务相关:
  - 涉及侧边栏树: 读取 modules/chat-sidebar-tree.md
  - 涉及聊天页路由或空间详情: 读取 modules/space-detail-routing.md
  - 涉及素材包页或数据请求: 读取 modules/material-library.md
  - 需要历史决策: 搜索 CHANGELOG.md → 读取对应 archive/{YYYY-MM}/{方案包}/proposal.md
```
