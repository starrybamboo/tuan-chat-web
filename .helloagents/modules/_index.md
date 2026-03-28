# 模块索引

> 通过此文件快速定位模块文档

## 模块清单

| 模块 | 职责 | 状态 | 文档 |
|------|------|------|------|
| chat-sidebar-tree | 管理空间左侧分类树的数据结构、渲染、拖拽和增删改 | ✅ | [chat-sidebar-tree.md](./chat-sidebar-tree.md) |
| space-detail-routing | 管理聊天页的空间详情路由、主内容切换和 material tab 入口 | ✅ | [space-detail-routing.md](./space-detail-routing.md) |
| material-library | 管理局内/局外素材包页面、查询、导入和编辑工作区 | ✅ | [material-library.md](./material-library.md) |

## 模块依赖关系

```text
chat-sidebar-tree → space-detail-routing → material-library
chat-sidebar-tree → material-library
```

## 状态说明
- ✅ 稳定
- 🚧 开发中
- 📝 规划中
