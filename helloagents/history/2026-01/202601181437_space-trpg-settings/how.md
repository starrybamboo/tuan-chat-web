# 技术设计: 跑团设置页面拆分

## 技术方案

### 核心技术
- React + 现有 SpaceContext 与查询 hooks

### 实现要点
- 新增 `SpaceDetailTab` 的 `trpg` 分支，并支持 `/chat/:spaceId/trpg` 路由识别。
- 空间下拉菜单新增“跑团设置”入口，指向新的 `trpg` 面板。
- 新建 `SpaceTrpgSettingWindow`，迁移空间规则与空间骰娘 UI 以及自动保存逻辑。
- `SpaceSettingWindow` 移除规则/骰娘相关状态与保存逻辑，保持空间描述编辑。
- 只读模式下阻断保存逻辑，仍展示当前规则与骰娘信息。

## 架构设计
无新增架构。

## 安全与性能
- **安全:** 非空间拥有者只读，禁止触发 `updateSpace` 与 `setSpaceExtra`。
- **性能:** 复用现有查询缓存，不新增全量加载逻辑。

## 测试与部署
- **测试:** `pnpm typecheck`、`pnpm lint`
- **部署:** 无额外步骤
