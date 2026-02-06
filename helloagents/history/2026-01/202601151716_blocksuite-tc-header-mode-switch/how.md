# 实施方案

## 总体策略

1. 入口收口：在 `BlocksuiteDescriptionEditor` 内部 tcHeader actions 渲染“切换到画布/退出画布”按钮；不再支持把该按钮隐藏并外置到业务 topbar。
2. 去外部控制：删除 `BlocksuiteDescriptionEditor` 的 `onActionsChange`（外部拿到 actions 来切换 mode），删除 blocksuite-frame 的 `set-mode` 消息处理与相关兜底状态。
3. 业务侧瘦身：`SpaceDetailPanel` 删除外层“切换到画布”按钮及其状态；`SpaceSettingWindow` 不再透传外部 mode/actions 参数。

## 代码改动点

- `app/components/chat/shared/components/blocksuiteDescriptionEditor.tsx`
  - 删除 props：`hideModeSwitchButton`、`onActionsChange`
  - 删除对外 actions：`BlocksuiteDescriptionEditorActions`
  - 删除 iframe host 与 frame 间的 `set-mode` 逻辑（仅保留 theme/height 等同步）
  - tcHeader 启用时，按钮固定渲染在 `.tc-blocksuite-tc-header-actions` 区域

- `app/routes/blocksuiteFrame.tsx`
  - 删除 query param：`hideModeSwitchButton`
  - 删除 message type：`set-mode`
  - 删除 `actionsRef/pendingModeRef` 以及 `onActionsChange` 相关代码

- `app/components/chat/window/spaceSettingWindow.tsx`
  - 删除 props：`hideEditorModeSwitchButton`、`onEditorActionsChange`、`onEditorModeChange`
  - `BlocksuiteDescriptionEditor` 不再传入 `hideModeSwitchButton/onActionsChange/onModeChange`（外层不再接管 mode）

- `app/components/chat/space/drawers/spaceDetailPanel.tsx`
  - 删除外层“切换到画布/退出画布”按钮
  - 删除 `spaceDocEditorActions/spaceDocEditorMode` ״̬

## 风险与回滚

- 风险：如果某些页面仍依赖外层按钮/程序化切换 mode，将在编译期暴露（props/类型被移除）。
- 回滚：恢复 `hideModeSwitchButton` + `onActionsChange` + blocksuite-frame `set-mode` 处理，并把外层按钮逻辑恢复到业务面板。
