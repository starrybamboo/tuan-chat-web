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
- Commit：`3314850d` `refactor: 拆分 AI 生图 preview pane / split ai image preview pane`

### [√] 批次 5：拆分 `InpaintDialog.tsx`

- 目标：拆分视口、mask 编辑和工具面板逻辑
- 验证：`corepack pnpm typecheck` 通过
- Commit：`d83846e9` `refactor: 拆分 AI 生图 inpaint dialog / split ai image inpaint dialog`

### [√] 批次 6：拆分 `AiImageSidebar.tsx`

- 目标：按面板区块拆分 Sidebar
- 验证：`corepack pnpm typecheck` 通过
- Commit：`6b857ae8` `refactor: 拆分 AI 生图 sidebar / split ai image sidebar`

### [√] 批次 7：拆分 `useAiImagePageController.ts`

- 目标：将 controller 瘦身为装配层
- 验证：`corepack pnpm typecheck` 通过
- Commit：`87c8cc6e` `refactor: 瘦身 AI 生图 controller / slim ai image controller`

## 执行日志

- 2026-04-22：计划创建，待开始批次 1。
- 2026-04-22：批次 1 完成。`helpers.ts` 已拆分为 `utils/` 下多个领域文件，现有导出入口保持兼容。
- 2026-04-22：进入批次 2，准备拆分 `api.ts` 与 `novelaiV45TokenMeter.ts`。
- 2026-04-22：批次 2 完成。`api.ts` 已拆分为 `api/` 子模块，`novelaiV45TokenMeter.ts` 已拆分为 `tokenMeter/` 子模块，旧入口保持兼容导出。
- 2026-04-22：进入批次 3，准备拆分 `AiImageHistoryPane.tsx`。
- 2026-04-22：批次 3 完成。`AiImageHistoryPane.tsx` 已拆分为 `history/` 子组件，主文件保留状态与装配逻辑。
- 2026-04-22：进入批次 4，准备拆分 `AiImagePreviewPane.tsx`。
- 2026-04-22：批次 4 完成。`AiImagePreviewPane.tsx` 已拆分为 `preview/` 子组件，主文件保留入口切换与装配逻辑。
- 2026-04-22：进入批次 5，准备拆分 `InpaintDialog.tsx`。
- 2026-04-22：批次 5 完成。`InpaintDialog.tsx` 已拆分出 `inpaintViewportUtils` 与工具面板/顶部操作栏/底部操作栏组件，主文件保留绘制与交互逻辑。
- 2026-04-22：进入批次 6，准备拆分 `AiImageSidebar.tsx`。
- 2026-04-22：批次 6 完成。`AiImageSidebar.tsx` 已拆出 `sidebar/baseImageSections`、`sidebar/ProBottomSettingsDrawer` 与 `sidebar/renderResolutionGlyph`，主文件保留状态与主体编辑流程。
- 2026-04-22：进入批次 7，准备拆分 `useAiImagePageController.ts`。
- 2026-04-22：批次 7 完成。`useAiImagePageController.ts` 已将末尾的 view-model 组装外提到 `controller/buildViewModels.ts`，主文件保留状态与行为实现。
- 2026-04-22：第二轮减重。`useAiImagePageController.ts` 继续外提 `metadata/history` 相关长回调到 `controller/metadataHistoryActions.ts`，文件从 3188 行降到 3006 行，`corepack pnpm typecheck` 通过。
- 2026-04-22：继续减重。`AiImageSidebar.tsx` 的 `simple/pro` 主体区已拆到 `sidebar/SimpleEditorContent.tsx` 与 `sidebar/ProEditorContent.tsx`，主文件当前降到 1177 行，`corepack pnpm typecheck` 通过。
