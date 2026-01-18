# 方案包：Blocksuite 画布切换入口收口到 tcHeader

## 背景与问题

“空间资料”的 Blocksuite 描述文档编辑器目前把“切换到画布/退出画布”的入口放在外层面板的 topbar（不在 tcHeader 内），导致：

- 交互入口分散：同一编辑器在不同页面入口位置不一致。
- 外层需要维护 editor mode 状态与切换逻辑（通过 actions + state），增加耦合。
- blocksuite-frame 与宿主之间存在“外部控制 mode”的通信与状态兜底逻辑，复杂度偏高。

## 目标

- 将“切换到画布/退出画布”按钮统一放入 Blocksuite 的 tcHeader actions 区。
- 删除外层（空间资料面板）对 editor mode 的外部控制与状态管理。
- 清理 BlocksuiteDescriptionEditor 对外的“外部控制 mode”通道：移除 `hideModeSwitchButton`、移除 `onActionsChange`、移除 blocksuite-frame 的 `set-mode` 消息处理。

## 非目标

- 不改变 `allowModeSwitch/fullscreenEdgeless` 的业务语义。
- 不引入新的持久化策略；沿用现有 DocModeProvider 行为。
