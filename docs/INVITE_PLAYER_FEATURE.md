# 邀请玩家功能文档

## 功能概述

添加了邀请玩家的功能，允许空间所有者或管理员生成邀请链接，方便玩家加入空间并自动成为玩家角色。

## 实现组件

### 1. InvitePlayerWindow (`app/components/chat/window/invitePlayerWindow.tsx`)

新建的邀请玩家窗口组件，提供以下功能：

#### 主要特性
- **邀请码生成**：支持生成玩家类型的邀请码（type=1）
- **过期时间选择**：支持 1 天、3 天、7 天、永不过期四种选项
- **邀请链接显示**：显示完整的邀请链接
- **一键复制**：提供复制到剪贴板功能，带有复制成功提示
- **用户反馈**：使用 toast 提示复制结果

#### 技术实现
- 使用 `useSpaceInviteCodeQuery` Hook 获取邀请码
- 动态管理邀请链接显示状态
- 支持多个过期时间同时请求，用户切换时快速显示

### 2. SpaceDetailPanel 修改 (`app/components/chat/sideDrawer/spaceDetailPanel.tsx`)

在空间详情面板中添加邀请玩家功能：

#### 修改内容
- 导入 `InvitePlayerWindow` 组件
- 添加 `isInvitePlayerOpen` 状态用于控制邀请窗口显示
- 在群成员列表按钮区域添加"邀请玩家"按钮
- 添加邀请玩家窗口的 PopWindow 弹框

#### 按钮展示条件
- 当空间成员数大于 0 时显示"邀请观战"和"邀请玩家"两个按钮

## API 接口对接

### 后端接口

```java
@GetMapping("/inviteCode")
@Operation(summary = "生成邀请码，过期时间以天为单位，为空则不过期,type0观战,type1玩家邀请")
public ApiResult<String> inviteCode(
    @RequestParam Long spaceId, 
    @RequestParam @Valid @Max(9) @Min(0) Integer type,
    @RequestParam(required = false) Long duration
)
```

- `spaceId`: 空间 ID
- `type`: 邀请码类型，0=观战，1=玩家
- `duration`: 过期时间（天数），可选

### 前端 Hook

```typescript
export function useSpaceInviteCodeQuery(spaceId: number, duration?: number, type: number = 0) {
    return useQuery({
        queryKey: ['inviteCode', duration, type],
        queryFn: () => tuanchat.spaceMemberController.inviteCode(spaceId, type, duration)
    })
}
```

## 使用流程

1. **打开空间详情**：点击空间相关操作进入空间详情面板
2. **选择邀请方式**：
   - 邀请观战：用户可作为观众加入
   - 邀请玩家：用户可直接成为玩家加入
3. **设置过期时间**：选择邀请码的有效期
4. **复制邀请链接**：点击"复制"按钮将链接复制到剪贴板
5. **分享链接**：将链接分享给其他玩家

## 链接格式

邀请链接格式为：`{origin}/invite/{code}`

例如：`http://localhost:3000/invite/abc123def456`

## 用户交互

- **过期时间切换**：点击不同的时间按钮自动切换邀请链接
- **复制反馈**：
  - 复制成功：按钮显示"✓ 已复制"（2秒后自动恢复）
  - Toast 提示成功消息
  - 链接生成中时复制按钮禁用

## 样式设计

- 使用 DaisyUI 组件库的按钮和表单样式
- 响应式布局支持不同屏幕尺寸
- 清晰的视觉层级和用户引导

## 注意事项

1. 邀请码生成是异步的，初始状态显示"生成中..."
2. 切换过期时间时会自动重置复制状态
3. 邀请链接需要前端已部署的邀请页面来处理加入逻辑
4. 建议在邀请页面实现后端的 `invited(code)` 接口调用

## 相关文件列表

- [invitePlayerWindow.tsx](../app/components/chat/window/invitePlayerWindow.tsx)
- [spaceDetailPanel.tsx](../app/components/chat/sideDrawer/spaceDetailPanel.tsx)
- [chatQueryHooks.tsx](../api/hooks/chatQueryHooks.tsx)

## 后续优化建议

1. 添加邀请码生成失败的错误处理
2. 支持邀请码的批量生成和管理
3. 添加邀请链接的使用统计
4. 实现邀请码的禁用和删除功能
