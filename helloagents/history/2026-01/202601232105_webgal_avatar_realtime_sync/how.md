# 技术设计: WebGAL 实时渲染立绘同步

## 技术方案

### 核心技术
- React Query 头像缓存（getRoleAvatar / getRoleAvatars）
- WebGAL RealtimeRenderer 内部缓存（avatarMap、uploadedSpritesMap、uploadedMiniAvatarsMap）
- 轻量事件通知（浏览器端 CustomEvent）

### 实现要点
1. 头像更新链路补齐缓存同步：
   - 在 useUpdateRoleAvatarMutation 的 onSuccess 内，使用更新后的 avatar 数据刷新 React Query 缓存。
   - 同步触发自定义事件 `webgal:avatar-updated`，携带 avatar 数据与 avatarId。
2. 渲染器缓存失效：
   - RealtimeRenderer 新增方法 `invalidateAvatarCaches(avatarId)`，清除已上传立绘/小头像缓存。
   - 保持 avatarMap 更新，以便 transform 与 spriteUrl 使用最新值。
3. 渲染侧订阅：
   - useRealtimeRender 订阅 `webgal:avatar-updated` 事件，在 renderer 存在时调用 `setAvatarCache` 并触发缓存失效。
   - 渲染器未启动时仅刷新 Query 缓存，待下次启用实时渲染时自动使用新数据。

## 架构设计
不引入新的跨端依赖，仅在前端模块内建立“头像更新 -> 事件通知 -> 渲染缓存刷新”的闭环。

## 安全与性能
- **安全:** 不涉及敏感数据传输，仅使用 avatarId 与前端缓存数据。
- **性能:** 仅失效单个 avatarId 的上传缓存，避免全量重建。

## 测试与验证
- 手动测试：开启 WebGAL 实时渲染 -> 角色页面修改立绘并保存 -> 回到聊天重新实时渲染，验证立绘已更新。
- 观察渲染日志，确认无重复的全量上传或异常报错。
