# Git Worktree Session 工作流（防止并行改动打架）

## 问题背景

在同一个工作目录里让多个并行 session 同时改代码，容易出现：

- 文件互相覆盖（尤其是自动格式化、代码生成、锁文件变更）
- 冲突集中爆发（合并时一次性堆积大量冲突）
- “我以为改的是 A session，但实际改到了 B session”的混乱

## 目标

把“并行工作”从 **同一份工作目录** 迁移到 **多个 worktree 目录**：

- 每个 session 有自己独立的工作目录与分支
- 主 worktree 只做集成入口（降低污染与冲突）

## 约定（本仓库默认）

- 主 worktree（集成入口）：`D:\A_collection\tuan-chat-web`
- 主集成分支：`dev-jxc`
- worktree 根目录：`D:\A_collection\tuan-chat-web.worktrees\`
- 分支命名：`session/YYYYMMDD-HHMM_<slug>`

> 说明：本仓库已移除根目录 `AGENTS.md`（避免影响团队协作）；如需让 Codex 在本机自动遵守，可使用本地 Skill：`tuan-chat-web`。

## 标准流程

### 1) 开始一个 session

在主 worktree 中：

1. 确认当前在 `dev-jxc`（或目标主分支）上
2. 创建 session worktree + session 分支

示例：

- `git worktree add -b session/20260113-1530_items-detail D:\A_collection\tuan-chat-web.worktrees\items-detail dev-jxc`

然后在 IDE 中打开 `D:\A_collection\tuan-chat-web.worktrees\items-detail` 进行开发。

### 2) 开发过程

只在 session worktree 内进行：

- 编辑代码、安装依赖、运行测试、生成文件
- `git status` / `git diff` / `git stash` / `git commit`（提交通常在集成前完成）

### 3) 结束并集成

在主 worktree（`dev-jxc`）中：

- 合并 session 分支（默认建议 `--no-ff` 保留一次 session 的边界）
- 验证通过后移除 worktree 目录

示例：

- `git merge --no-ff session/20260113-1530_items-detail`
- `git worktree remove D:\A_collection\tuan-chat-web.worktrees\items-detail`

### 4) 常用排查

- 查看所有 worktree：`git worktree list`
- 查找某个目录对应的 worktree：`git worktree list --porcelain`

## 为什么“新会话没有遵守”

如果只在对话里口头约定，新的 Codex 会话不一定继承上下文；本仓库不再提供 `AGENTS.md`，建议把约定写入知识库文档，并在个人环境中通过本地 Skill（`tuan-chat-web`）启用。

