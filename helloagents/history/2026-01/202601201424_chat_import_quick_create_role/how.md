# 技术设计: 导入文本无角色时快速创建角色

## 技术方案

- 在 `ImportChatMessagesWindow` 增加可选回调 `onOpenRoleAddWindow`。
- 当 `availableRoles` 为空且 `isKP=false` 时，在弹窗内展示“创建/导入角色”按钮。
- 点击按钮后关闭导入弹窗，并打开 `roleAddPop`（复用现有 `AddRoleWindow` 与其中的“创建角色”入口）。

## 安全与性能

- **安全:** 仅打开已有角色入口，不新增权限或数据写入。
- **性能:** 纯 UI 逻辑，无额外性能影响。

