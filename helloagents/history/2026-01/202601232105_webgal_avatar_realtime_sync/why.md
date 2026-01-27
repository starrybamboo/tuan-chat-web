# 变更提案: WebGAL 实时渲染立绘同步

## 需求背景
- 角色页面调整立绘（位置/缩放/旋转/透明度/替换）后，聊天室 WebGAL 实时渲染重新渲染仍使用旧立绘。
- WebGAL 渲染器维护独立头像缓存与已上传立绘缓存，且 React Query 头像缓存默认长时间有效，导致更新无法及时透传。

## 变更内容
1. 头像更新成功后，直接刷新 React Query 头像缓存，并通知 WebGAL 渲染器更新对应 avatar 数据。
2. 对应 avatarId 的已上传立绘/小头像缓存失效，确保重新渲染时重新上传最新资源。
3. 保持现有交互流程不变，仅修正数据同步与缓存更新时机。

## 影响范围
- **模块:** WebGAL 实时渲染、角色头像更新、聊天实时渲染编排
- **文件:**
  - app/webGAL/realtimeRenderer.ts
  - app/webGAL/useRealtimeRender.ts
  - app/webGAL/avatarSync.ts (新增)
  - api/hooks/RoleAndAvatarHooks.tsx
  - helloagents/wiki/modules/webgal.md

## 核心场景

### 需求: 立绘更新实时生效
**模块:** webgal / chat / role
角色页面保存立绘调整后，聊天室 WebGAL 实时渲染重新渲染应使用最新立绘数据。

#### 场景: 角色页面修改立绘后实时渲染使用新数据
前置条件：
- 已开启 WebGAL 实时渲染
- 在角色页面完成立绘调整并保存

预期结果：
- 返回聊天室重新实时渲染后，立绘使用最新位置/缩放/旋转/透明度与图像资源

## 风险评估
- **风险:** 频繁清除缓存导致重复上传、增加渲染耗时。
- **缓解:** 仅针对单个 avatarId 失效缓存，且仅在头像更新成功时触发。
