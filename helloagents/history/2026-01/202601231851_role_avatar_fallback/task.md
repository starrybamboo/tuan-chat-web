# 任务清单: 房间角色头像兜底显示

目录: `helloagents/plan/202601231851_role_avatar_fallback/`

---

## 1. 头像展示逻辑
- [√] 1.1 在 `api/hooks/RoleAndAvatarHooks.tsx` 中为 useGetRoleAvatarsQuery 增加 enabled 参数，验证 why.md#需求-导入角色头像自动展示-场景-角色-avatarid-为空
- [√] 1.2 在 `app/components/common/roleAvatar.tsx` 中实现 avatarId 为空时的头像兜底展示，验证 why.md#需求-导入角色头像自动展示-场景-角色-avatarid-为空

## 2. 安全检查
- [√] 2.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 3. 文档更新
- [√] 3.1 更新 helloagents/wiki/modules/chat.md

## 4. 测试
- [-] 4.1 手动验证：房间“角色+ / NPC+”导入后头像直接显示
  > 备注: 未进行手动验证
