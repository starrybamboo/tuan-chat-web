# AI 生图模块重构计划

## 约束

- 现有功能逻辑不能有任何变化
- 每个批次完成后都要执行 `pnpm typecheck`
- 每个批次完成后都要立即执行一次 git commit
- 本文件在每个批次完成后同步更新状态、验证结果和 commit hash

## 批次列表

### [√] 批次 1：拆分 `helpers.ts`

- 目标：按领域拆分纯函数与工具方法
- 目标文件：
  - `app/components/aiImage/utils/base.ts`
  - `app/components/aiImage/utils/v4Character.ts`
  - `app/components/aiImage/utils/promptText.ts`
  - `app/components/aiImage/utils/imageData.ts`
  - `app/components/aiImage/utils/historyMapping.ts`
  - `app/components/aiImage/utils/dragDrop.ts`
  - `app/components/aiImage/utils/sizeRules.ts`
  - `app/components/aiImage/utils/modelRules.ts`
  - `app/components/aiImage/utils/storage.ts`
  - `app/components/aiImage/utils/metadataImport.ts`
- 验证：`corepack pnpm typecheck` 通过；`corepack pnpm vitest run app/components/aiImage/helpers.test.ts` 通过
- Commit：`6d55a345` `refactor: 拆分 AI 生图 helpers / split ai image helpers`

### [√] 批次 2：拆分 `api.ts` 与 `novelaiV45TokenMeter.ts`

- 目标：拆分请求构建、后端 URL、tokenizer 与 snapshot 逻辑
- 验证：`corepack pnpm typecheck` 通过；`corepack pnpm vitest run app/components/aiImage/api.test.ts` 通过；`corepack pnpm vitest run app/components/aiImage/novelaiV45TokenMeter.test.ts` 通过
- Commit：`af8b2764` `refactor: 拆分 AI 生图 api 与 token meter / split ai image api and token meter`

### [√] 批次 3：拆分 `AiImageHistoryPane.tsx`

- 目标：拆分确认弹窗、列表项、页脚操作和分区组件
- 验证：`corepack pnpm typecheck` 通过
- Commit：`5e61b26a` `refactor: 拆分 AI 生图 history pane / split ai image history pane`

### [√] 批次 4：拆分 `AiImagePreviewPane.tsx`

- 目标：拆分预览区、工具栏和 Director 相关组件
- 验证：`corepack pnpm typecheck` 通过
- Commit：本批次提交中，hash 将在下一次计划更新时回写

### [ ] 批次 5：拆分 `InpaintDialog.tsx`

- 目标：拆分视口、mask 编辑和工具面板逻辑
- 验证：待执行
- Commit：待执行

### [ ] 批次 6：拆分 `AiImageSidebar.tsx`

- 目标：按面板区块拆分 Sidebar
- 验证：待执行
- Commit：待执行

### [ ] 批次 7：拆分 `useAiImagePageController.ts`

- 目标：将 controller 瘦身为装配层
- 验证：待执行
- Commit：待执行

## 执行日志

- 2026-04-22：计划创建，待开始批次 1。
- 2026-04-22：批次 1 完成。`helpers.ts` 已拆分为 `utils/` 下多个领域文件，现有导出入口保持兼容。
- 2026-04-22：进入批次 2，准备拆分 `api.ts` 与 `novelaiV45TokenMeter.ts`。
- 2026-04-22：批次 2 完成。`api.ts` 已拆分为 `api/` 子模块，`novelaiV45TokenMeter.ts` 已拆分为 `tokenMeter/` 子模块，旧入口保持兼容导出。
- 2026-04-22：进入批次 3，准备拆分 `AiImageHistoryPane.tsx`。
- 2026-04-22：批次 3 完成。`AiImageHistoryPane.tsx` 已拆分为 `history/` 子组件，主文件保留状态与装配逻辑。
- 2026-04-22：进入批次 4，准备拆分 `AiImagePreviewPane.tsx`。
- 2026-04-22：批次 4 完成。`AiImagePreviewPane.tsx` 已拆分为 `preview/` 子组件，主文件保留入口切换与装配逻辑。
