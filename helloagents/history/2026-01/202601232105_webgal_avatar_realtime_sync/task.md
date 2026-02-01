# 任务清单: WebGAL 实时渲染立绘同步

Ŀ¼: `helloagents/plan/202601232105_webgal_avatar_realtime_sync/`

---

## 1. WebGAL 事件与缓存失效
- [?] 1.1 在 `app/webGAL/avatarSync.ts` 新增头像更新事件工具（emit/on/off），验证 why.md#需求-立绘更新实时生效-场景-角色页面修改立绘后实时渲染使用新数据
- [?] 1.2 在 `app/webGAL/realtimeRenderer.ts` 新增 `invalidateAvatarCaches(avatarId)`，清除对应上传缓存，验证 why.md#需求-立绘更新实时生效-场景-角色页面修改立绘后实时渲染使用新数据
- [?] 1.3 在 `app/webGAL/useRealtimeRender.ts` 订阅事件并刷新渲染缓存，验证 why.md#需求-立绘更新实时生效-场景-角色页面修改立绘后实时渲染使用新数据

## 2. 头像更新链路
- [?] 2.1 在 `api/hooks/RoleAndAvatarHooks.tsx` 的 `useUpdateRoleAvatarMutation` 中刷新 Query 缓存并触发事件，验证 why.md#需求-立绘更新实时生效-场景-角色页面修改立绘后实时渲染使用新数据

## 3. 安全检查
- [?] 3.1 校验事件触发仅在浏览器环境执行，避免 SSR 运行错误（window 判空）

## 4. 文档更新
- [?] 4.1 更新 `helloagents/wiki/modules/webgal.md` 记录同步策略与缓存失效行为

## 5. 测试
- [-] 5.1 手动验证：开启 WebGAL 实时渲染 -> 角色页面修改立绘并保存 -> 返回聊天室重新实时渲染，确认立绘更新生效
> ??: ???????
