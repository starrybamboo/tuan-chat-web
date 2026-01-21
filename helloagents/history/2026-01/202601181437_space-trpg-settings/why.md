# 变更提案: 跑团设置页面拆分

## 需求背景
空间资料页同时承载空间规则与骰娘配置，入口混杂且成员难以快速定位。需要独立页面承载跑团相关配置，并维持成员可见、空间拥有者可编辑的权限边界。

## 变更内容
1. 空间下拉菜单新增“跑团设置”入口，单独页面展示空间规则与空间骰娘。
2. 空间资料页移除空间规则与空间骰娘配置，仅保留空间描述与基础信息。
3. 跑团设置页面对所有成员可见，空间拥有者可编辑。

## 影响范围
- **模块:** chat
- **文件:** `app/components/chat/space/spaceHeaderBar.tsx`、`app/components/chat/space/drawers/spaceDetailPanel.tsx`、`app/components/chat/chatPage.tsx`、`app/components/chat/window/spaceSettingWindow.tsx`、`app/components/chat/window/spaceTrpgSettingWindow.tsx`
- **API:** `spaceController.updateSpace`、`spaceController.setSpaceExtra`
- **数据:** `space.ruleId`、`space.extra.dicerRoleId`

## 核心场景

### 需求: 跑团设置入口
**模块:** chat
在空间下拉菜单点击“跑团设置”。
- 预期结果: 打开新页面展示空间规则与空间骰娘。

### 需求: 权限分离
**模块:** chat
成员查看跑团设置页面。
- 预期结果: 所有人可见，非空间拥有者只读。

### 需求: 空间资料收敛
**模块:** chat
空间资料页不再显示规则/骰娘。
- 预期结果: 空间资料仅保留描述与基础信息。

## 风险评估
- **风险:** 非拥有者误触发保存导致权限越界。
- **缓解:** 只读模式下禁用交互与保存逻辑。
