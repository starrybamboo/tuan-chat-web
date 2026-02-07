# ToastWindow 组件使用说明

## 概述

`toastWindow` 是一个函数式弹窗组件，可以通过函数调用的方式在应用中动态显示模态窗口。它基于 React Portal 技术实现，能够保持 React Router 上下文的访问能力。
在底层，它通过 `ToastWindowFrame` 渲染，因此样式保持一致，可以直接使用 toastWindow。

## 基本用法

```typescript
import toastWindow from "@/components/common/toastWindow/toastWindow";

// 基本用法
toastWindow(
  <div>
    <h3>确认操作</h3>
    <p>您确定要删除这条记录吗？</p>
  </div>
);

// 带回调函数的用法
toastWindow(
  (close) => (
    <div>
      <h3>操作确认</h3>
      <p>请确认您的操作</p>
      <button onClick={close}>取消</button>
    </div>
  )
);
```

## API 接口

### 函数签名

```typescript
function toastWindow(
  children: ((close: () => void) => React.ReactNode) | React.ReactNode,
  options?: ToastWindowOptions
): { update: (newChildren: React.ReactNode) => void; close: () => void }
```

### 参数说明

#### `children`
- **类型**: `((close: () => void) => React.ReactNode) | React.ReactNode`
- **说明**: 要在弹窗中显示的内容
- **两种形式**:
  - **静态内容**: 直接传入 React 节点
  - **函数形式**: 传入一个函数，接收 `close` 回调作为参数

#### `options` (可选)
- **类型**: `ToastWindowOptions`
- **属性**:
  - `fullScreen?: boolean` - 是否全屏显示 (默认: false)
  - `transparent?: boolean` - 是否透明背景 (默认: false)
  - `onclose?: () => void` - 关闭时的回调函数

### 返回值

返回一个对象，包含以下方法：
- `update(newChildren: React.ReactNode)` - 更新弹窗内容
- `close()` - 手动关闭弹窗

## 关键特性

### 1. close 函数的使用

`close` 函数是关闭弹窗的核心机制，有以下几种使用方式：

```typescript
// 方式一：函数式 children 中使用
toastWindow(
  (close) => (
    <div>
      <h3>选择操作</h3>
      <button onClick={() => {
        // 执行业务逻辑
        handleSomeAction();
        // 关闭弹窗
        close();
      }}>确认</button>
      <button onClick={close}>取消</button>
    </div>
  )
);

// 方式二：通过返回值手动关闭
const toast = toastWindow(<div>内容</div>);
// 稍后关闭
setTimeout(() => toast.close(), 3000);
```

### 2. Context 上下文注意事项

#### ✅ 保持上下文连接

`toastWindow` 会在根组件中渲染，因此不能访问 Context！需要手动提供！

```typescript
// 示例：提供 RoomContext
toastWindow(
  (close) => (
    <RoomContext.Provider value={roomContext}>
      <div className="flex flex-col">
        <ExpressionChooser
          roleId={message.roleId}
          handleExpressionChange={(avatarId) => {
            handleExpressionChange(avatarId);
            close(); // 关闭弹窗
          }}
          handleRoleChange={(roleId) => {
            handleRoleChange(roleId);
            close(); // 关闭弹窗
          }}
        />
      </div>
    </RoomContext.Provider>
  )
);
```

## 实际使用示例

### 示例 1: 确认对话框

```typescript
function showDeleteConfirmation(itemName: string) {
  toastWindow(
    (close) => (
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">确认删除</h3>
        <p className="mb-6">您确定要删除 "{itemName}" 吗？此操作不可撤销。</p>
        <div className="flex gap-4 justify-end">
          <button 
            className="btn btn-ghost" 
            onClick={close}
          >
            取消
          </button>
          <button 
            className="btn btn-error" 
            onClick={() => {
              deleteItem(itemName);
              close();
            }}
          >
            删除
          </button>
        </div>
      </div>
    ),
    {
      onclose: () => console.log('对话框已关闭')
    }
  );
}
```

### 示例 2: 表单弹窗

```typescript
function showEditForm(initialData: any) {
  toastWindow(
    (close) => {
      const [formData, setFormData] = useState(initialData);
      
      return (
        <div className="p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">编辑信息</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            saveData(formData);
            close();
          }}>
            <input 
              className="input input-bordered w-full mb-4"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="名称"
            />
            <div className="flex gap-4 justify-end">
              <button type="button" className="btn btn-ghost" onClick={close}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                保存
              </button>
            </div>
          </form>
        </div>
      );
    },
    { fullScreen: false }
  );
}
```

## 最佳实践

### 1. 及时关闭弹窗

```typescript
// ✅ 正确：操作完成后关闭
toastWindow(
  (close) => (
    <button onClick={() => {
      doSomething();
      close(); // 关闭弹窗
    }}>确认</button>
  )
);

// ❌ 错误：忘记关闭弹窗
toastWindow(
  (close) => (
    <button onClick={() => {
      doSomething();
      // 忘记调用 close()
    }}>确认</button>
  )
);
```

### 2. 处理异步操作

```typescript
toastWindow(
  (close) => {
    const [loading, setLoading] = useState(false);
    
    const handleSubmit = async () => {
      setLoading(true);
      try {
        await submitData();
        close(); // 成功后关闭
      } catch (error) {
        console.error(error);
        // 错误时不关闭，显示错误信息
      } finally {
        setLoading(false);
      }
    };
    
    return (
      <div>
        <button 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? '提交中...' : '提交'}
        </button>
      </div>
    );
  }
);
```

### 3. SSR 兼容性

组件已内置 SSR 支持，在服务端渲染期间会安全地跳过 DOM 操作。

## 技术实现

- **基于 React Portal**: 在 `modal-root` 元素中渲染
- **全局状态管理**: 使用 `ToastWindowManager` 管理多个弹窗
- **上下文保持**: 在现有 React 树中渲染，保持所有上层 Context
- **SSR 安全**: 客户端检测，避免服务端 DOM 操作
