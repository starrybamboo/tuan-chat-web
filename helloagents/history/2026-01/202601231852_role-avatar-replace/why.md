# 变更提案: 角色头像替换

## 需求背景
- 角色页面现有头像管理支持新增与裁剪，但缺少“替换已有头像”的入口。
- 用户希望在给定 avatarId 时直接更新头像内容，避免新增头像导致列表膨胀。

## 产品分析

### 目标用户与场景
- **用户群体:** 角色创建/维护者
- **使用场景:** 在角色页面调整头像时希望保持 avatarId 不变
- **核心痛点:** 只能新增头像，替换需删除重建

### 价值主张与成功指标
- **价值主张:** 替换头像更快，保留 avatarId 关联关系
- **成功指标:** 角色页面内一次完成替换且列表/预览同步刷新

### 人文关怀
- 提供明确提示或确认，降低误替换风险。

## 变更内容
1. 在角色头像设置中新增“替换头像”入口，针对当前选中头像。
2. 使用 AvatarController.updateRoleAvatar 更新 avatarUrl/spriteUrl/originUrl/transform，保留 avatarId。
3. 更新缓存与预览，替换后列表与预览刷新。

## 影响范围
- **模块:** 角色页面头像管理
- **文件:** app/components/Role/sprite/Tabs/AvatarSettingsTab.tsx, app/components/Role/RoleInfoCard/AvatarUploadCropper.tsx, api/hooks/RoleAndAvatarHooks.tsx
- **API:** AvatarController.updateRoleAvatar
- **数据:** RoleAvatar

## 核心场景

### 需求: 替换选中头像
**模块:** 角色头像管理  
在角色页面选中头像后可替换图片，保持 avatarId 不变。

#### 场景: 角色编辑页替换头像
前置条件: 已选中某个 avatarId。
- 上传新头像并完成裁剪后，当前 avatarId 的头像内容被替换。
- 头像列表与预览刷新为新内容。

## 风险评估
- **风险:** 误操作替换错误头像
- **缓解:** 替换入口显示当前头像信息并增加确认提示
