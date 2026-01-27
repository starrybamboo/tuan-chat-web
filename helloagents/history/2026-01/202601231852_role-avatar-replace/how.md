# 技术设计: 角色头像替换

## 技术方案
### 核心技术
- React / TypeScript
- AvatarController.updateRoleAvatar
- AvatarUploadCropper + UploadUtils

### 实现要点
- 在 AvatarSettingsTab 增加“替换头像”入口，基于当前选中 avatarId 触发替换。
- 复用 AvatarUploadCropper 完成上传与裁剪，输出 avatarUrl/spriteUrl/originUrl/transform。
- 将 transform 映射为 spriteXPosition/spriteYPosition/spriteScale/spriteTransparency/spriteRotation。
- 更新后刷新 getRoleAvatars 与 getRoleAvatar 缓存，确保预览同步。

## 架构设计
无新增架构变更，复用现有角色头像管理链路。

## API 设计
### PUT /avatar
- **请求:** RoleAvatarRequest (avatarId, roleId, avatarUrl, spriteUrl, originUrl, spriteXPosition, spriteYPosition, spriteScale, spriteTransparency, spriteRotation)
- **响应:** RoleAvatar

## 数据模型
- RoleAvatar: avatarId, roleId, avatarUrl, spriteUrl, originUrl, spriteXPosition, spriteYPosition, spriteScale, spriteTransparency, spriteRotation, avatarTitle

## 安全与性能
- **安全:** 前端校验 avatarId/roleId 非空，失败提示；避免覆盖空字段。
- **性能:** 仅刷新相关 query，避免全局重刷。

## 测试与部署
- **测试:** 手动验证替换流程与列表刷新；回归新增/删除/裁剪流程。
- **部署:** 前端发布，无后端变更。
