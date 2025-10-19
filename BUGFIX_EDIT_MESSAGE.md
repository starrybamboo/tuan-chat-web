# 修复: 编辑消息时别人发信息会卡死

## 问题描述
当用户正在编辑消息时,如果其他用户发送新消息,会导致正在编辑的消息组件卡死或响应缓慢。

## 根本原因
1. **EditableField 组件性能问题**: 
   - 原来的实现在 `useEffect` 中依赖 `editContent`,每次输入都会触发高度调整
   - 新消息到达时触发整个聊天列表重新渲染,导致正在编辑的组件也重新渲染

2. **缺少渲染优化**:
   - ChatBubble 组件没有使用 React.memo 优化,导致所有消息都会重新渲染
   - 编辑状态没有被隔离保护,外部更新会干扰正在进行的编辑

## 修复方案

### 1. 优化 EditableField 组件 (`app/components/common/editableField.tsx`)

#### 变更 1: 避免在编辑过程中被外部 content 更新干扰
```typescript
// 使用 ref 来避免在编辑时被外部 content 更新干扰
const isEditingRef = useRef(isEditing);
useEffect(() => {
  isEditingRef.current = isEditing;
}, [isEditing]);

// 只在开始编辑时同步外部 content 到 editContent
useEffect(() => {
  if (isEditing && editContent !== content) {
    // 如果刚进入编辑模式,同步外部内容
    setEditContent(content);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isEditing]); // 只依赖 isEditing,避免在编辑过程中被外部 content 更新干扰
```

#### 变更 2: 优化高度调整逻辑
```typescript
// 使用回调函数来调整高度,避免在每次 editContent 变化时触发 effect
const adjustTextareaHeight = useCallback(() => {
  if (textareaRef.current) {
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}, []);

// 只在进入编辑模式时调整一次高度
useEffect(() => {
  if (isEditing && !usingInput) {
    adjustTextareaHeight();
  }
}, [isEditing, usingInput, adjustTextareaHeight]);

// 处理内容变化,同时调整高度
const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setEditContent(e.target.value);
  // 立即调整高度而不是通过 useEffect
  if (!usingInput) {
    adjustTextareaHeight();
  }
};
```

**关键改进**:
- 移除了 `editContent` 作为 `useEffect` 的依赖项
- 在输入时直接调用 `adjustTextareaHeight()` 而不是触发 effect
- 减少了不必要的重新渲染

### 2. 优化 ChatBubble 组件 (`app/components/chat/chatBubble.tsx`)

#### 变更 1: 使用 React.memo 避免不必要的重新渲染
```typescript
// 使用 React.memo 优化性能,避免不必要的重新渲染
// 只在 chatMessageResponse 的内容真正变化时才重新渲染
export const ChatBubble = React.memo(ChatBubbleComponent, (prevProps, nextProps) => {
  // 自定义比较函数:只比较消息的关键属性
  const prevMsg = prevProps.chatMessageResponse.message;
  const nextMsg = nextProps.chatMessageResponse.message;
  
  return (
    prevMsg.messageId === nextMsg.messageId
    && prevMsg.content === nextMsg.content
    && prevMsg.avatarId === nextMsg.avatarId
    && prevMsg.roleId === nextMsg.roleId
    && prevMsg.updateTime === nextMsg.updateTime
    && prevMsg.messageType === nextMsg.messageType
    && prevProps.useChatBubbleStyle === nextProps.useChatBubbleStyle
  );
});
```

**关键改进**:
- 当新消息到达时,只有实际变化的消息会重新渲染
- 正在编辑的消息不会因为新消息的到达而重新渲染
- 显著提升了聊天界面的性能

## 测试建议
1. 打开聊天窗口并开始编辑一条消息
2. 让另一个用户发送新消息
3. 验证编辑框保持响应,光标位置不变
4. 确认能正常完成编辑并保存

## 性能影响
- **减少不必要的渲染**: 通过 React.memo,新消息不会导致其他消息重新渲染
- **优化编辑体验**: 移除了每次输入时的 useEffect 触发,提升输入流畅度
- **隔离编辑状态**: 编辑过程中不会被外部更新干扰

## 相关文件
- `app/components/common/editableField.tsx` - 可编辑字段组件
- `app/components/chat/chatBubble.tsx` - 聊天气泡组件
