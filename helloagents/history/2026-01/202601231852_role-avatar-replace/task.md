# 任务清单: 角色头像替换

目录: `helloagents/plan/202601231852_role-avatar-replace/`

---

## 1. 角色头像替换入口
- [√] 1.1 在 `app/components/Role/sprite/Tabs/AvatarSettingsTab.tsx` 增加替换头像入口与回调，基于当前 avatarId 调用 updateRoleAvatar 并刷新缓存；验证 why.md#需求-替换选中头像-场景-角色编辑页替换头像

## 2. 上传组件适配
- [√] 2.1 在 `app/components/Role/RoleInfoCard/AvatarUploadCropper.tsx` 增加可选的本地状态或自定义 key，避免替换入口与新增入口冲突；验证 why.md#需求-替换选中头像-场景-角色编辑页替换头像

## 3. 缓存与数据同步
- [√] 3.1 在 `api/hooks/RoleAndAvatarHooks.tsx` 或替换逻辑中补充 getRoleAvatar/getRoleAvatars 的失效策略，确保替换后预览刷新；验证 why.md#需求-替换选中头像-场景-角色编辑页替换头像

## 4. 安全检查
- [√] 4.1 执行安全检查（G9）：输入校验、权限与错误提示，避免替换空 avatarId。

## 5. 文档更新
- [√] 5.1 更新 `helloagents/wiki/modules/app.md` 记录角色头像替换入口与行为。

## 6. 测试
- [-] 6.1 手动验证角色页面替换头像流程（上传/裁剪/应用/列表刷新）。
  > 备注: 未执行手动验证
