# How: 完善现有项目知识库（模块化补齐）

## 1. 新增模块文档

- 在 `helloagents/wiki/modules/` 下新增：
  - `chat.md`
  - `blocksuite.md`
  - `ai-image.md`
  - `webgal.md`

原则：
- 以“入口路径 + 关键约定 + 常见坑位入口”为主，避免把实现细节写成代码注释的替代品。
- 与 `modules/app.md` 保持互补：`app.md` 作为事实汇总，新模块文档作为可导航索引与维护入口。

## 2. 新增本地开发工作流

- 在 `helloagents/wiki/workflows/` 下新增 `local-dev.md`，统一记录安装/命令/常见问题，并链接到 `tooling.md` 与 worktree 工作流。

## 3. 更新项目概览索引

- 更新 `helloagents/wiki/overview.md` 的模块表格与快速链接，加入新增模块文档与工作流入口。

