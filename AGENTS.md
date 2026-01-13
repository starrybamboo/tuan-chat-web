# Codex / HelloAGENTS 工作区约定（Worktree-first）

本仓库默认采用 **“每个 session 独立 worktree + 独立分支”** 的工作方式，以避免多个并行 session 在同一工作目录中互相覆盖改动。

## 默认约定

- **主 worktree（集成入口）**: `D:\A_collection\tuan-chat-web`
- **主集成分支（默认）**: `dev-jxc`
- **session worktree 根目录**: `D:\A_collection\tuan-chat-web.worktrees\`
- **session 分支命名**: `session/YYYYMMDD-HHMM_<slug>`
  - `<slug>` 为本次 session 的短标识（如 `items-detail` / `novelai-http`）

## 对 Codex 的执行要求

当用户请求涉及“修改/新增/删除仓库文件、运行会产出改动的脚本、批量格式化/重构”等操作时：

1. **不得**直接在主 worktree 上进行开发改动（除非用户明确要求或确认这么做）。
2. 必须先创建（或复用）一个 **session worktree**，并在该目录下完成所有开发操作。
3. 需要集成时，回到主 worktree，将 session 分支合入 `dev-jxc`，再清理该 session worktree。

### 创建 session worktree（示例）

在主 worktree 执行：

- 创建分支并创建 worktree：
  - `git worktree add -b session/20260113-1530_items-detail D:\A_collection\tuan-chat-web.worktrees\items-detail dev-jxc`

### 集成与清理（示例）

在主 worktree（`dev-jxc`）执行：

- `git merge --no-ff session/20260113-1530_items-detail`
- `git worktree remove D:\A_collection\tuan-chat-web.worktrees\items-detail`
- （可选）`git branch -d session/20260113-1530_items-detail`

## 一键合并与清理（脚本）

为减少人工操作，本仓库提供一键脚本：`scripts/integrate-session.ps1`。

**推荐用法：在 session worktree 中执行（会合并到 `dev-jxc` 并移除当前 session worktree）**

- 交互确认：
  - `.\scripts\integrate-session.ps1`
- 无交互（自动继续）：
  - `.\scripts\integrate-session.ps1 -Yes`
- 合并后删除 session 分支（可选）：
  - `.\scripts\integrate-session.ps1 -Yes -DeleteBranch`
- 自动提交未提交改动后再合并（可选）：
  - `.\scripts\integrate-session.ps1 -Yes -AutoCommit -CommitMessage "fix: room setting context menu"`
- 仅预览将执行的操作（不会产生改动）：
  - `.\scripts\integrate-session.ps1 -DryRun`

**说明**
- 脚本会执行 `git merge --no-ff`，因此会产生一次 merge commit（仅本地，不会自动 push）。
- 若主 worktree 存在未提交改动，脚本会直接中止以避免丢失改动；session worktree 默认也会中止，可用 `-AutoCommit` 自动提交。

## 重要边界与安全约束

- 若主 worktree 存在大量未提交改动，**先提示用户处理（提交/暂存/迁移）**，避免继续“打架”。
- **不要自动 `git commit` / `git push`**：除非用户明确要求或在“结束/集成”环节确认。
- 若用户自己在主 worktree 手动编辑文件，仍可能产生冲突；最佳实践是用户也打开对应的 session worktree 目录进行编辑。

