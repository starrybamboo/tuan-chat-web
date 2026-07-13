# Web 端 UI 端到端验收记录

## 验收环境

- 日期：2026-07-12
- 地址：`http://127.0.0.1:5178`
- 账号：`10001`（降星驰）
- 浏览器：Codex In-App Browser，使用已有登录态
- 桌面视口：`1440 × 900`
- 移动视口：`390 × 844`
- 验收方式：页面导航、DOM 快照、控制台日志、交互点击、桌面与移动截图

## 修改记录

### 1. 全局开发覆盖层

| 项目 | 修改前 | 修改后 | 结果 |
| --- | --- | --- | --- |
| React Scan | 开发环境默认启动并显示组件边界、工具栏和 FPS 面板，污染所有产品页面 | 仅当 `VITE_ENABLE_REACT_SCAN=true` 时启动 | 页面截图恢复产品真实视觉 |
| TanStack Router Devtools | 开发环境默认显示，覆盖顶栏 Bug 反馈区域 | 仅当 `VITE_ENABLE_ROUTER_DEVTOOLS=true` 时显示 | 顶栏无遮挡 |

> 2026-07-14 策略更新：React Scan 在 development 与 test mode 默认启用，production mode 保持关闭。

- 修改文件：`apps/web/app/routes/__root.tsx`
- 修改前证据：[`before/discover.png`](assets/web-ui-e2e-2026-07-12/before/discover.png)
- 修改后证据：[`after/discover.png`](assets/web-ui-e2e-2026-07-12/after/discover.png)
- 参考图：[`reference/sidebar-overlap.png`](assets/web-ui-e2e-2026-07-12/reference/sidebar-overlap.png)

### 2. AI 绘图移动布局

| 项目 | 修改前 | 修改后 | 结果 |
| --- | --- | --- | --- |
| `390px` 布局 | 参数栏、预览区、历史栏横向压缩，文字逐字竖排 | 参数区占上半屏，预览与历史区占下半屏 | 文本保持可读，页面无横向滚动 |

- 修改文件：`apps/web/app/routes/_dashboard/ai-image.tsx`、`apps/web/app/components/aiImage/AiImageWorkspace.tsx`
- 修改前证据：[`before/mobile-ai-image.png`](assets/web-ui-e2e-2026-07-12/before/mobile-ai-image.png)
- 修改后证据：[`after/mobile-ai-image-fixed.png`](assets/web-ui-e2e-2026-07-12/after/mobile-ai-image-fixed.png)
- 桌面回归：[`after/ai-image.png`](assets/web-ui-e2e-2026-07-12/after/ai-image.png)

### 3. 侧栏按钮选中态

| 项目 | 修改前 | 修改后 | 结果 |
| --- | --- | --- | --- |
| 空间、私信、发现、房间的选中反馈 | daisyUI 默认焦点/边框与活动光标叠加，出现白色外轮廓；后续增加的语义色背景与描边形成重复选中层 | 移除按钮自身的选中背景、描边和选中色；空间、私信、发现仅由活动光标表达，房间保持普通按钮表面；键盘焦点使用独立的信息色焦点环 | 选中提示来源单一，按钮本体保持普通表面层与悬停反馈 |

- 修改文件：`apps/web/app/components/chat/shared/components/chatSidebarActiveTone.ts`、`apps/web/app/components/chat/shared/components/spaceButton.tsx`、`apps/web/app/components/chat/shared/components/roomButton.tsx`、`apps/web/app/components/chat/space/chatSpaceSidebar.tsx`
- 修改前证据：[`reference/sidebar-selected-outline.png`](assets/web-ui-e2e-2026-07-12/reference/sidebar-selected-outline.png)
- 修改后证据：本轮按要求不重新执行端到端截图，由用户人工复核最终选中态。
- 动效说明：活动光标使用共享 layout id 跟随空间/房间切换；悬停放大与键盘焦点环由用户人工复核。

## 路由验收清单

“通过”表示页面有有效内容、无框架错误覆盖层、页面级横向滚动为零；占位页保留当前产品状态并记录截图喵。

| 路由 | 状态 | 当前证据 |
| --- | --- | --- |
| `/chat` | 通过 | [`after/chat-landing.png`](assets/web-ui-e2e-2026-07-12/after/chat-landing.png) |
| `/chat/discover` | 通过，占位内容 | [`after/discover.png`](assets/web-ui-e2e-2026-07-12/after/discover.png) |
| `/chat/discover/my` | 通过，占位内容 | [`after/discover-my.png`](assets/web-ui-e2e-2026-07-12/after/discover-my.png) |
| `/chat/discover/material` | 通过，占位内容 | [`after/discover-material.png`](assets/web-ui-e2e-2026-07-12/after/discover-material.png) |
| `/chat/discover/material/my` | 通过，占位内容 | [`after/discover-material-my.png`](assets/web-ui-e2e-2026-07-12/after/discover-material-my.png) |
| `/chat/10387/11100` | 通过，真实空间与房间 | [`after/chat-space-tide.png`](assets/web-ui-e2e-2026-07-12/after/chat-space-tide.png) |
| `/role` | 通过 | [`after/role.png`](assets/web-ui-e2e-2026-07-12/after/role.png) |
| `/role/14135?rule=1` | 通过，角色详情 | [`after/role-detail-xi.png`](assets/web-ui-e2e-2026-07-12/after/role-detail-xi.png) |
| `/ai-image` | 通过 | [`after/ai-image.png`](assets/web-ui-e2e-2026-07-12/after/ai-image.png) |
| `/feedback` | 通过 | [`after/feedback.png`](assets/web-ui-e2e-2026-07-12/after/feedback.png) |
| `/feedback/4` | 通过，反馈详情 | [`after/feedback-detail-4.png`](assets/web-ui-e2e-2026-07-12/after/feedback-detail-4.png) |
| `/notifications` | 通过，重复等待后内容稳定 | [`after/notifications.png`](assets/web-ui-e2e-2026-07-12/after/notifications.png) |
| `/settings` | 通过 | [`after/settings.png`](assets/web-ui-e2e-2026-07-12/after/settings.png) |
| `/material` | 通过，占位内容 | [`after/material.png`](assets/web-ui-e2e-2026-07-12/after/material.png) |
| `/profile/10001` | 通过，个人主页 | [`after/profile-10001.png`](assets/web-ui-e2e-2026-07-12/after/profile-10001.png) |
| `/chat/10387/11100/setting` | 通过，房间设置 | [`after/chat-setting-tide.png`](assets/web-ui-e2e-2026-07-12/after/chat-setting-tide.png) |
| `/room-map/10387/11100` | 通过，空地图上传态 | [`after/room-map-tide.png`](assets/web-ui-e2e-2026-07-12/after/room-map-tide.png) |

## 交互与动效验收

- 空间切换：`潮汐 → 菌丝`，活动光标跟随空间头像移动，目标空间保持选中态；证据：[`after/chat-space-space-switch.png`](assets/web-ui-e2e-2026-07-12/after/chat-space-space-switch.png)。
- 房间切换：`开头1：女主醒来 → 开头二：ASMR`，房间活动光标跟随选中行移动；证据：[`after/chat-space-room-switch.png`](assets/web-ui-e2e-2026-07-12/after/chat-space-room-switch.png)。
- 光标动画、悬停放大、拖拽中的连续性需要人工目测复核，浏览器截图只能证明最终状态。
- `prefers-reduced-motion` 变体列入人工复核，当前代码使用 `MotionConfig reducedMotion="user"` 与 `motion-reduce` 样式。

## 未修改项

- `/chat/discover*`、`/material`、`/room-map/*` 的重写或上传占位内容属于当前产品状态，本轮保留。
- 登录页未退出当前验收账号，使用已登录态完成业务页面验收。

## 验收结论

全局调试覆盖层与 AI 绘图移动端压缩已完成修复；桌面主要路由、真实聊天室、角色、反馈、通知、设置、个人主页和房间设置均完成截图与 DOM 验证喵。
