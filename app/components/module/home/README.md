# 模组首页卡片组件使用说明

## 概述

`Modulehome.tsx` 文件包含了一套完整的卡片组件系统，专为模组首页设计，支持显示文段内容和图片。

## 组件介绍

### 1. ContentCard 主卡片组件

这是核心的卡片组件，支持多种展示模式：

#### 属性 (Props)
- `image?: string` - 图片URL
- `imageAlt?: string` - 图片alt文本
- `title?: string` - 卡片标题
- `content?: string` - 文段内容
- `className?: string` - 自定义CSS类名
- `onClick?: () => void` - 点击事件处理函数
- `type?: "text" | "image" | "mixed"` - 卡片类型
- `shadow?: boolean` - 是否显示阴影 (默认: true)
- `size?: "sm" | "md" | "lg"` - 卡片尺寸 (默认: "md")
- `theme?: "default" | "primary" | "secondary" | "accent"` - 主题颜色 (默认: "default")

#### 使用示例

```tsx
// 纯文本卡片
<ContentCard
  title="标题"
  content="这是卡片的内容描述..."
  type="text"
  theme="primary"
  onClick={() => console.log("卡片被点击")}
/>

// 纯图片卡片
<ContentCard
  image="https://example.com/image.jpg"
  type="image"
  size="lg"
/>

// 混合模式卡片 (图片 + 文字)
<ContentCard
  title="标题"
  image="https://example.com/image.jpg"
  content="描述文字..."
  type="mixed"
/>
```

### 2. ModuleHomeCardContainer 容器组件

用于布局和组织多个卡片：

#### 属性 (Props)
- `children: React.ReactNode` - 子组件
- `title?: string` - 容器标题
- `className?: string` - 自定义CSS类名

#### 使用示例

```tsx
<ModuleHomeCardContainer title="精选内容" className="mb-8">
  <ContentCard title="卡片1" content="内容1" />
  <ContentCard title="卡片2" content="内容2" />
  <ContentCard title="卡片3" content="内容3" />
</ModuleHomeCardContainer>
```

## 设计特性

### 视觉效果
- 支持悬停效果：阴影增强 + 轻微缩放
- 图片懒加载和缩放动画
- 渐变遮罩提高文字可读性
- 响应式网格布局 (移动端1列，平板2列，桌面3列)

### 主题支持
- `default`: 默认白色背景
- `primary`: 主色调背景
- `secondary`: 次要色调背景  
- `accent`: 强调色背景

### 尺寸选项
- `sm`: 小尺寸 (padding: 1rem, text: 0.875rem)
- `md`: 中等尺寸 (padding: 1.5rem, text: 1rem) 
- `lg`: 大尺寸 (padding: 2rem, text: 1.125rem)

## 自定义扩展

### 添加新的主题
在 `themeClasses` 对象中添加新的主题：

```tsx
const themeClasses = {
  // 现有主题...
  success: "bg-success text-success-content",
  warning: "bg-warning text-warning-content",
};
```

### 添加新的尺寸
在 `sizeClasses` 对象中添加新的尺寸：

```tsx
const sizeClasses = {
  // 现有尺寸...
  xs: "p-2 text-xs",
  xl: "p-10 text-xl",
};
```

## 性能优化建议

1. 为图片使用适当的尺寸和格式 (WebP推荐)
2. 为大量卡片实现虚拟滚动
3. 使用 `React.memo` 包装卡片组件以避免不必要的重渲染
4. 考虑使用图片懒加载库

## 无障碍访问 (Accessibility)

- 所有图片都有适当的 alt 属性
- 按钮有正确的 type 属性
- 支持键盘导航
- 颜色对比度符合 WCAG 标准

## 兼容性

- 支持所有现代浏览器
- 移动端友好的响应式设计
- 与 Tailwind CSS 和 DaisyUI 完全兼容
