# 变更提案: 房间角色头像兜底显示

## 需求背景
房间通过“角色+ / NPC+”导入角色后，部分角色 avatarId 为空，导致列表头像为空，需要进入头像选择器才会显示。

## 变更内容
1. 角色头像展示优先使用角色已有 avatarId。
2. 当 avatarId 为空时，前端从该角色头像列表中取第一个头像作为展示兜底。
3. 仅修正显示，不写回角色数据。

## 影响范围
- 模块: chat, common
- 文件: app/components/common/roleAvatar.tsx, api/hooks/RoleAndAvatarHooks.tsx
- API: 无
- 数据: 无

## 核心场景

### 需求: 导入角色头像自动展示
**模块:** chat
导入角色后应立即显示头像。

#### 场景: 角色 avatarId 为空
房间角色列表中存在 avatarId 为空的角色。
- 预期结果: 角色头像展示为该角色头像列表的第一个头像。

## 风险评估
- 风险: 额外的头像列表请求增加。
- 缓解: 仅在 avatarId 为空且 roleId 有效时发起请求。
