# 任务清单: sidebar-material-package-tree

> **@status:** completed | 2026-03-28 17:22

```yaml
@feature: sidebar-material-package-tree
@created: 2026-03-28
@status: completed
@mode: R3
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 9 | 0 | 0 | 9 |

---

## 任务列表

### 1. 侧边栏树模型与默认树

- [√] 1.1 在 `app/components/chat/room/sidebarTree.ts` 中扩展 `material-package` 节点类型、默认树与归一化逻辑 | depends_on: []
- [√] 1.2 在 `app/components/chat/room/useRoomSidebarTreeState.ts`、`app/components/chat/room/useRoomSidebarNormalizer.ts`、`app/components/chat/hooks/useSpaceSidebarTreeActions.ts` 中接入素材包元数据 | depends_on: [1.1]

### 2. 聊天页侧边栏渲染与交互

- [√] 2.1 在 `app/components/chat/chatPage.tsx`、`app/components/chat/chatPageSidePanelContent.tsx`、`app/components/chat/room/chatRoomListPanel.tsx` 中查询并透传空间素材包与当前选中素材包状态 | depends_on: [1.2]
- [√] 2.2 新增 `app/components/chat/room/roomSidebarMaterialPackageItem.tsx`，并在分类渲染链路中支持素材包节点展示与拖拽 | depends_on: [2.1]
- [√] 2.3 调整侧边栏分类菜单与节点分发文案，使素材包节点接入后仍保持可用 | depends_on: [2.2]

### 3. 素材包页路由同步

- [√] 3.1 在 `app/components/material/pages/spaceMaterialLibraryPage.tsx` 中改为由 `spacePackageId` 查询参数驱动选中素材包与编辑弹层 | depends_on: [2.1]
- [√] 3.2 确保创建、删除、关闭编辑器后 URL 与页面状态同步，并兼容嵌入聊天页和独立路由 | depends_on: [3.1]

### 4. 测试与知识库同步

- [√] 4.1 在 `app/components/chat/room/sidebarTree.test.ts` 中补充默认树、自动补齐与失效节点清理测试 | depends_on: [1.1]
- [√] 4.2 根据最终代码更新 `.helloagents` 模块文档与变更记录 | depends_on: [1.1, 2.3, 3.2, 4.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-28 17:02 | 方案包创建 | completed | 已生成 `202603281702_sidebar-material-package-tree` |
| 2026-03-28 17:12 | 设计定稿 | completed | 采用 `material-package` 叶子节点方案 |
| 2026-03-28 17:19 | 代码实现 | completed | 侧边栏树、聊天页路由与局内素材包页已联动完成 |
| 2026-03-28 17:19 | 自动化验证 | completed | `corepack pnpm exec vitest run app/components/chat/room/sidebarTree.test.ts` 通过 |
| 2026-03-28 17:20 | 构建与类型检查 | completed | `corepack pnpm typecheck` 与 `corepack pnpm build` 均通过 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等
>
> - 本方案保留现有 `/chat/:spaceId/material` 路由，使用 `spacePackageId` 查询参数定位具体素材包。
> - 素材包分类采用系统分类 `cat:materials` 自动补齐，兼容旧 `treeJson`。
