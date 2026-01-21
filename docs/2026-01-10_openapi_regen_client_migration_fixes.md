# 2026-01-10 OpenAPI 重新生成后的前端修复（SidebarTree + Typecheck/Lint）

## 背景
- 后端交互接口已通过 OpenAPI 重新生成，前端不再需要手写 fetch 包装层。
- 重新生成后，部分旧页面仍依赖已下线的 Stage/Commit 相关类型与 controller，导致 `pnpm typecheck` 与 `pnpm lint` 失败。

## 本次变更
### 1) SidebarTree 改用生成的 OpenAPI client
- 侧边栏树（space sidebar tree）的 React Query hooks 改为调用生成的 `spaceSidebarTreeController`。
- 删除已不再使用的手写包装文件：`api/custom/spaceSidebarTree.ts`。

### 2) 兼容已下线的 Stage/Commit 旧页面
- 新增占位类型：`api/deprecated/StageEntityResponse.ts`
  - 用于承接旧 UI 的类型依赖（例如 Quill 提及、模组详情页的一些实体展示）。
  - 放在 `api/deprecated`，避免被 OpenAPI 代码生成覆盖。
- `api/hooks/moduleQueryHooks.tsx` 中移除对不存在的 `commitController` 依赖：
  - `useModuleInfoQuery` / `useModuleInfoByCommitIdQuery` 返回占位数据（空 `responses` 和空 `sceneMap`），避免旧页面报错。

### 3) 工程质量
- 修复 `.vscode/tasks.json` 的 tab 缩进与文件末尾换行，消除 JSONC lint 报错。
- 修复 `tsconfig.json` 的 JSONC 缩进报错。
- 补齐 `StageEntityInfo` 中旧字段类型（`desc/tips/act.kp/avatar` 等），使严格类型检查通过。

## 验证
- `pnpm lint` 通过。
- `pnpm typecheck` 通过。

## 后续建议
- 如果 Stage/Commit 相关能力未来不会回归，可逐步删除对应旧 UI 与 hooks，减少占位逻辑。
- 若后端重新提供“模组详情/场景图”能力，建议在 OpenAPI 中补齐正式 schema 与 endpoint，再替换占位数据。
