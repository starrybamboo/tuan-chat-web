
# 服务端状态与缓存约定

前端把服务端返回的可复用数据统一视为 React Query 管理的服务端状态。业务代码不应在组件、工具函数或运行时服务里绕过缓存层重复打同一个读接口；写请求也必须通过缓存层维护一致性。

## 核心规则

1. 可复用读请求必须有稳定的 `queryKey`，并通过 `useQuery`、`useInfiniteQuery`、`useQueries` 或 `queryClient.fetchQuery` 读取。
2. 跨 React 组件使用读缓存时，显式传入当前 `QueryClient`，不要在业务模块里 `new QueryClient()`。应用级单例在 `app/queryClient.ts`，根节点通过 `QueryClientProvider` 注入同一个实例。
3. 查询结果要保持接口约定的响应形状。后端返回 `ApiResult<T>` 时，缓存中也应保留 `{ success: true, data }`，不要只塞裸 `data`。
4. 写请求可以乐观更新，但必须能回滚。非乐观 patch 必须先确认业务成功，也就是 `result.success === true`，再 `setQueryData` 或 `setQueriesData`。
5. 写请求业务失败时不能把缓存改成成功态，也不能删除仍然有效的旧缓存。失败后可以按需 `invalidateQueries`，让后续读取重新校准。
6. 登录、登出和 401 失效是账号边界，必须清空 `QueryClient`，避免旧账号的空间、房间、角色、用户资料等缓存被新账号复用。
7. WebSocket 或后台事件只负责让相关 query 失效或做可证明安全的局部 patch，不能直接维护另一套长期服务端状态。

## 推荐结构

- 在 hook 文件或共享 query 包里集中导出 `queryKey` 生成函数，例如 `roleAvatarQueryKey(avatarId)`、`roomExtraQueryKey(roomId, key)`。
- 对组件外部的运行时服务提供 `fetchXxxWithCache(queryClient, ...)`，内部使用 `queryClient.fetchQuery`。
- 对写请求提供小的缓存辅助函数，例如“写入 extra 后同步 key 级缓存和聚合缓存”“头像更新后同步详情、列表和角色外观缓存”。
- 对同一实体的多个展示入口同步更新时，优先复用同一个 patch helper，避免某个入口仍读到旧数据。

## 允许例外

以下请求可以不进入长期 React Query 缓存，但需要在代码旁说明原因：

- 实时消息流、历史补洞、WebSocket 断线追平等强时序数据。
- OSS 上传签名、一次性上传、一次性导出等短生命周期请求。
- 纯事件型写请求，且没有可复用读模型需要立即 patch。
- 底层工具函数在没有 `QueryClient` 的兼容 fallback。React 调用链应优先传入 `QueryClient`。

## 检查清单

新增或改动服务端读写逻辑时，至少检查：

- 是否存在可以复用的 `queryKey` 或 `fetchXxxWithCache`。
- 是否在 React 上下文外创建了新的 `QueryClient`。
- 写请求是否只在 `success === true` 后 patch 或 remove cache。
- 失败、401、登出、切换账号是否会留下旧账号缓存。
- 直接接口调用是否属于上面的允许例外。
