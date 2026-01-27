# 技术设计: 房间角色头像兜底显示

## 技术方案
### 核心技术
- React + React Query

### 实现要点
- useGetRoleAvatarsQuery 增加 enabled 选项以控制请求。
- RoleAvatarComponent 在 avatarId 无效时拉取角色头像列表，取第一张头像用于展示。

## 安全与性能
- 安全: 仅使用已有接口数据，不新增敏感信息处理。
- 性能: 通过 enabled 限制无效 avatarId 的请求。

## 测试与部署
- 测试: 手动验证“角色+ / NPC+”导入后头像直接显示。
- 部署: 常规前端发布。
