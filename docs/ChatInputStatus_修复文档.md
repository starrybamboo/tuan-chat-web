# 聊天输入状态显示与切换问题修复

## 问题描述

用户报告聊天输入状态存在以下问题：
1. 状态无法显示
2. 状态无法修改
3. 打字时状态不会自动切换到"输入中"
4. 手动选择状态也没有效果

## 问题根本原因

经过代码分析，发现以下核心问题：

### 1. 状态响应式更新问题

**位置**：`app/components/chat/hooks/useChatInputStatus.ts`

**问题**：
- `myStatus` 的计算直接从 `webSocketUtils.chatStatus` 读取，但没有正确触发React的响应式更新
- 使用了 `chatStatusRef.current` 来读取状态，但 ref 的更新不会触发组件重新渲染

**代码问题示例**：
```typescript
// ❌ 错误：直接返回值，没有响应式依赖
const myStatus: ChatStatusType = webSocketUtils.chatStatus[roomId]?.find(s => s.userId === userId)?.status ?? "idle";

// ❌ 错误：在回调中使用 ref 读取状态
const currentStatus = chatStatusRef.current[roomId]?.find(s => s.userId === userId)?.status ?? "idle";
```

### 2. 依赖项配置问题

**问题**：
- useEffect 中使用了 `webSocketUtils.chatStatus` 但没有添加到依赖数组中
- ESLint 警告被忽略，导致状态变化时回调函数没有使用最新的状态

## 修复方案

### 1. 使用 useMemo 确保响应式更新

```typescript
// ✅ 修复：使用 useMemo 计算 myStatus
const myStatus: ChatStatusType = React.useMemo(() => {
  const status = webSocketUtils.chatStatus[roomId]?.find(s => s.userId === userId)?.status ?? "idle";
  log(LogLevel.DEBUG, "📊 计算 myStatus", { status, roomId, userId });
  return status;
}, [webSocketUtils.chatStatus, roomId, userId]);
```

### 2. 创建 getCurrentStatus 回调函数

为了避免在 useEffect 依赖数组中直接添加 `webSocketUtils.chatStatus`（会导致频繁重新渲染），创建一个 useCallback 包装的获取函数：

```typescript
// ✅ 修复：创建获取当前状态的回调函数
const getCurrentStatus = useCallback((): ChatStatusType => {
  return chatStatusRef.current[roomId]?.find(s => s.userId === userId)?.status ?? "idle";
}, [roomId, userId]);
```

### 3. 在回调中使用 getCurrentStatus

```typescript
// ✅ 修复：在防抖计时器中使用 getCurrentStatus
inputDebounceTimerRef.current = setTimeout(() => {
  const now = Date.now();
  const currentStatus = getCurrentStatus(); // 使用回调函数而不是直接访问 ref
  // ... 其他逻辑
}, 300);
```

### 4. 更新依赖数组

```typescript
// ✅ 修复：添加 getCurrentStatus 到依赖数组
}, [inputText, roomId, userId, lockDurationMs, sendStatusUpdate, getCurrentStatus]);
```

## 修改文件列表

1. `app/components/chat/hooks/useChatInputStatus.ts`
   - 添加 React 导入
   - 使用 useMemo 计算 myStatus
   - 创建 getCurrentStatus 回调函数
   - 更新所有依赖数组
   - 启用调试日志（DEBUG_ENABLED = true）

2. `app/components/chat/chatToolbar.tsx`
   - 添加调试日志到状态选择器

3. `app/components/chat/roomWindow.tsx`
   - 添加调试日志监控 myStatue 状态变化

## 测试建议

### 1. 基本功能测试

- [ ] 打开聊天窗口，检查状态选择器是否正确显示当前状态
- [ ] 在输入框中打字，观察状态是否自动切换到"输入中"
- [ ] 停止输入10秒，观察状态是否自动切换到"空闲"
- [ ] 手动点击状态选择器，切换不同状态，验证是否生效

### 2. 边界情况测试

- [ ] 快速连续打字，观察状态切换是否流畅（防抖机制）
- [ ] 手动切换状态后3秒内打字，验证手动锁是否生效
- [ ] 观战成员不应显示状态选择器
- [ ] 多个窗口同时打开同一房间，验证冲突检测机制

### 3. 调试日志检查

打开浏览器控制台，观察以下日志输出：

- `[ChatInputStatus] 🚀 Hook 初始化`
- `[ChatInputStatus] ⌨️ 输入变化触发 useEffect`
- `[ChatInputStatus] 📊 计算 myStatus`
- `[ChatInputStatus] 📤 尝试发送状态更新`
- `🔄 RoomWindow: myStatue 状态变化`
- `🖱️ 状态选择器被点击`

## 后续优化建议

### 1. 性能优化

当前修复方案已经解决了功能问题，但还可以进一步优化：

- 考虑将 `chatStatus` 从 WebSocket hook 中独立出来，使用独立的 Context 管理
- 减少不必要的日志输出（在生产环境中关闭 DEBUG_ENABLED）

### 2. 代码重构

- 将状态管理逻辑抽离到独立的状态管理库（如 Zustand）
- 统一管理所有聊天相关的状态，避免 prop drilling

### 3. 测试覆盖

- Ϊ `useChatInputStatus` hook 编写单元测试
- 为状态切换逻辑编写集成测试

## 注意事项

1. **调试日志**：当前启用了调试日志（DEBUG_ENABLED = true），在生产环境部署前需要关闭
2. **性能监控**：留意控制台中的 "⚡ PERF" 日志，监控 hook 执行性能
3. **WebSocket 连接**：确保 WebSocket 连接正常，状态同步依赖于 WebSocket 通信

## 相关文件

- `app/components/chat/hooks/useChatInputStatus.ts` - 主要修复文件
- `app/components/chat/chatToolbar.tsx` - 状态选择器UI
- `app/components/chat/roomWindow.tsx` - 状态管理调用方
- `api/useWebSocket.tsx` - WebSocket 状态管理
- `api/wsModels.ts` - WebSocket 消息类型定义
