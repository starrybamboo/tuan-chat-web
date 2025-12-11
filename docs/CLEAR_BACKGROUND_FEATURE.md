# 清除背景功能实现文档

## 功能概述

在 WebGAL 联动模式下，新增"清除背景"功能，允许用户通过导演控制台一键清除当前的 WebGAL 背景图。

## 实现原理

### 核心思路

使用现有的特效消息类型 (`EffectMessage`)，发送一个特殊的 `effectName` 来触发背景清除：

1. 发送一个 `messageType: EFFECT` 的消息
2. 设置 `effectName` 为 `"clearBackground"`
3. WebGAL 实时渲染系统识别到这个特效名称
4. 执行 WebGAL 的 `changeBg:none` 指令清除背景

### 技术细节

#### 前端实现

**文件**: `app/components/chat/roomWindow.tsx`

特效消息和清除背景都不需要角色信息，类似旁白：

```typescript
const handleSendEffect = useCallback((effectName: string) => {
  // 特效消息不需要角色信息，类似旁白
  send({
    roomId,
    roleId: undefined,
    avatarId: undefined,
    content: `[特效: ${effectName}]`,
    messageType: MessageType.EFFECT,
    extra: {
      effectMessage: {
        effectName,
      },
    },
  });
}, [roomId, send]);

const handleClearBackground = useCallback(() => {
  // 清除背景不需要角色信息，类似旁白
  send({
    roomId,
    roleId: undefined,
    avatarId: undefined,
    content: "[清除背景]",
    messageType: MessageType.EFFECT,
    extra: {
      effectMessage: {
        effectName: "clearBackground",
      },
    },
  });
  toast.success("已清除背景");
}, [roomId, send]);
```

#### WebGAL 渲染器集成

**文件**: `app/webGAL/realtimeRenderer.ts`

在处理特效消息时，添加对 `clearBackground` 的特殊处理：

```typescript
// 处理特效消息 (Type 8)
if (msg.messageType === 8) {
  const effectMessage = msg.extra?.effectMessage;
  if (effectMessage && effectMessage.effectName) {
    let command: string;
    if (effectMessage.effectName === "none") {
      command = "pixiInit -next;";
    }
    else if (effectMessage.effectName === "clearBackground") {
      // 清除背景：使用 WebGAL 的 changeBg:none 指令
      command = "changeBg:none -next;";
    }
    else {
      command = `pixiPerform:${effectMessage.effectName} -next;`;
    }
    await this.appendLine(targetRoomId, command, syncToFile);
  }
}
```

#### UI 集成

**文件**: `app/components/chat/chatToolbar.tsx`

在导演控制台菜单中添加：

```tsx
{onClearBackground && (
  <>
    <div className="divider my-1"></div>
    <li><a onClick={onClearBackground}>🗑️ 清除背景</a></li>
  </>
)}
```

#### 后端支持

**文件**: `src/main/java/com/jxc/tuanchat/chat/domain/entity/message/EffectMessage.java`

后端的 `EffectMessage` 类已经支持任意 `effectName`，无需修改：

```java
@NotNull
@Schema(description = "特效名称")
private String effectName;
```

支持的特效名称包括：
- `rain` - 下雨
- `snow` - 下雪
- `sakura` - 樱花
- `none` - 清除特效
- `clearBackground` - 清除背景（新增）

## 使用方式

1. 开启"联动模式"（工具栏中的链接图标）
2. 点击"导演控制台"按钮（扳手图标）
3. 在弹出菜单中选择"🗑️ 清除背景"
4. 系统会发送特效消息，WebGAL 执行 `changeBg:none` 清空背景
5. 特效消息在聊天记录中显示为旁白样式，带有"特效"标签

## 显示效果

特效消息（包括清除背景、下雨、下雪等）在聊天记录中的显示效果：

- **无角色头像**：不显示发送者信息
- **旁白样式**：使用浅灰色背景，斜体文字
- **特效标签**：右上角显示蓝色"特效"标签，与旁白的"旁白"标签区分
- **内容显示**：如 `[清除背景]`、`[特效: rain]` 等

## 优势

1. **复用特效消息架构**: 无需新增消息类型
2. **语义清晰**: 清除背景本质上是一种"特效"操作
3. **实现简洁**: 后端完全无需修改，只需前端添加处理逻辑
4. **易于扩展**: 可以轻松添加其他类似的控制指令（如清除立绘等）
5. **符合 WebGAL 规范**: 直接使用 `changeBg:none` 原生指令

## 注意事项

1. **无需角色**: 特效消息和清除背景不需要选择角色，类似旁白消息
2. 该功能仅在开启 WebGAL 联动模式时可见
3. 清除背景操作会作为一条特效消息记录在聊天历史中
4. 消息内容显示为 `[清除背景]`，便于用户识别
5. 特效消息的 `roleId` 和 `avatarId` 都设置为 `undefined`（不传递）
6. 特效消息在聊天记录中显示为旁白样式，带有"特效"标签，不会显示【Undefined】占位符

## 相关代码修改

### ChatBubble 组件

**文件**: `app/components/chat/chatBubble.tsx`

修改了旁白判断逻辑和显示样式：

```typescript
// 判断是否为旁白（无角色）- 包括 roleId 为空/undefined/0/负数 的情况
const isNarrator = !message.roleId || message.roleId <= 0;

// 旁白渲染时，根据消息类型显示不同标签
{message.messageType === MESSAGE_TYPE.EFFECT
  ? <span className="badge badge-xs badge-info">特效</span>
  : <span className="badge badge-xs badge-secondary">旁白</span>}
```

## 相关文件

- `app/components/chat/chatToolbar.tsx` - UI 组件和接口定义
- `app/components/chat/roomWindow.tsx` - 业务逻辑实现
- `app/components/chat/chatBubble.tsx` - 消息显示组件（旁白样式渲染）
- `app/webGAL/realtimeRenderer.ts` - WebGAL 渲染器集成
- `src/main/java/com/jxc/tuanchat/chat/domain/entity/message/EffectMessage.java` - 后端消息模型
- `docs/WEBGAL_REALTIME_RENDER.md` - WebGAL 实时渲染文档（已更新）

## 更新记录

- **2025-12-10**: 初始实现，使用特效消息类型实现清除背景功能
- **2025-12-10**: 修改特效消息显示样式，改为旁白样式，解决【Undefined】占位符问题
- **2025-12-10**: 修复历史消息扫描时清除背景不生效的问题，调整 extra 字段结构为 `{ effectMessage: { effectName } }`
