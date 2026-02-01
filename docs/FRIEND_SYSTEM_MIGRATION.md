# 好友体系（前端）迁移说明

> 目的：前端不再将“好友”抽象为“互关/双向关注”，而是以服务端 FriendController（好友申请/同意/拒绝/拉黑/好友列表）为唯一权威来源。

## 背景

历史实现里，部分页面将 `UserFollow` 的 `status === 2`（互关）当作“好友列表”来源。这与后端新的“好友体系”语义不一致。

本次前端改动将私聊与邀请成员等关键入口，迁移到 **FriendController** 提供的真实好友列表与好友申请流程。

## 后端接口（前端 OpenAPI 已生成）

以下接口在前端通过 `tuanchat.friendController.*` 调用（由 openapi-typescript-codegen 生成）：

- 好友列表：`POST /capi/friend/list`
  - `FriendListRequest`（分页参数）
  - 返回：`FriendResponse[]`

- 好友关系检查：`POST /capi/friend/check`
  - `FriendCheckRequest { targetUserId }`
  - 返回：`FriendCheckResponse`
    - `isFriend?: boolean`
    - `status?: number`（1-待确认，2-已接受，3-已拉黑）
    - `statusDesc?: string`
    - `canSendMessage?: boolean`

- 发送好友申请：`POST /capi/friend/request/send`
  - `FriendReqSendRequest { targetUserId, verifyMsg }`（后端已改为必填）

- 同意好友申请：`POST /capi/friend/request/accept`
  - `FriendReqHandleRequest { friendReqId }`

- 拒绝好友申请：`POST /capi/friend/request/reject`
  - `FriendReqHandleRequest { friendReqId }`

- 好友申请分页：`POST /capi/friend/request/page`
  - `PageBaseRequest { pageNo, pageSize }`
  - 返回：`PageBaseRespFriendReqResponse { list, pageNo, pageSize, totalRecords, isLast }`
  - 单条记录：`FriendReqResponse`（含 `type: "sent" | "received"`、`status/statusDesc`、`fromUser/toUser` 等）

> 备注：删除好友、拉黑/取消拉黑等接口同样存在，但本次私聊页的最小可用能力未强制接入。

## 前端 hooks 封装

### 位置

- `api/hooks/friendQueryHooks.tsx`

### 已提供的 hooks

- `useGetFriendListQuery(requestBody)`
  - QueryKey：`["friendList", requestBody]`
  - 用途：获取当前用户好友列表（用于私聊联系人列表、邀请成员搜索）

- `useCheckFriendQuery(targetUserId, enabled?)`
  - QueryKey：`["friendCheck", targetUserId]`
  - 用途：检查与指定用户的关系（私聊搜索结果展示状态、控制是否可进入私聊）

- `useGetFriendRequestPageQuery(requestBody, enabled?)`
  - QueryKey：`["friendRequestPage", requestBody]`
  - 用途：获取好友申请列表（含 sent/received）

- `useSendFriendRequestMutation()`
  - 成功后失效：`friendCheck(targetUserId)`、`friendRequestPage`

- `useAcceptFriendRequestMutation()`
  - 成功后失效：`friendRequestPage`、`friendList`、`friendCheck`

- `useRejectFriendRequestMutation()`
  - 成功后失效：`friendRequestPage`、`friendCheck`

### 缓存策略

- 好友列表与好友关系检查：`staleTime` 设为 5 分钟（减少频繁刷新）
- 申请列表：`staleTime` 设为 30 秒（更偏实时）

## 私聊页面改动

### 联系人来源迁移

- 私聊联系人/好友列表数据源从“互关好友列表”迁移到 `FriendController.getFriendList` 的 `FriendResponse[]`。
- 优点：`FriendResponse` 已包含 `username/avatar`，无需再做额外的二次 `userInfo` 拉取。

### 私聊“无会话”页（UserSearch）增加能力

文件：`app/components/privateChat/components/UserSearch.tsx`

1) 顶部新增“好友申请（待处理）”折叠区
- 读取 `useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 })`
- 过滤：`type === "received" && status === 1`（待处理且是收到的）
- 操作：同意/拒绝（mutation）

2) 搜索用户结果增强
- 在搜索结果项上展示 `FriendCheckResponse.statusDesc`
- 非好友且非拉黑时，提供“验证信息（必填）+ 加好友”（与后端 `@NotNull` 保持一致）
- 当 `canSendMessage === false` 时，点击该用户进入私聊会被拦截并提示

> 说明：这里选择了“私聊页内最小可用”的方式接入好友申请能力，不引入新的页面/路由。

## 邀请成员窗口改动

- 邀请成员窗口的“搜索好友并邀请加入”同样从互关/关注体系迁移为好友列表 `FriendResponse[]`。
- 搜索过滤直接基于 `friend.username` 完成。

## 与旧体系（互关/关注）的关系

- `UserFollow` 仍用于“关注/粉丝/关注列表”等社交关注语义。
- “好友/私聊联系人”不再依赖互关抽象。

## 已知限制与后续建议

- 当前私聊页仅展示“收到的待处理申请（received + pending）”，未单独展示 sent 列表或历史列表；如需可以扩展 UI。
- “删除好友 / 拉黑 / 取消拉黑”接口未在私聊页做入口，如需要可以在用户卡片右侧增加操作按钮。
- Ŀǰ UI 使用 alert 进行最小提示（未引入新的 toast 依赖）。如项目已有统一消息组件，可以替换为统一提示。
