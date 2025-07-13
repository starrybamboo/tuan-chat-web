import React from "react";
import Carousel from "../carousel";

// 卡片内容类型定义
interface ContentCardProps {
  // 可选的图片
  image?: string;
  imageAlt?: string;
  // 标题
  title?: string;
  // 文段内容
  content?: string;
  // 自定义样式类名
  className?: string;
  // 点击事件
  onClick?: () => void;
  // 卡片类型：文本卡片或图片卡片
  type?: "text" | "image" | "mixed";
  // 是否显示阴影
  shadow?: boolean;
  // 卡片大小
  size?: "sm" | "md" | "lg";
  // 背景色主题
  theme?: "default" | "primary" | "secondary" | "accent";
}

// 主要的内容卡片组件
export function ContentCard({
  image,
  imageAlt,
  title,
  content,
  className = "",
  onClick,
  type = "mixed",
  shadow = true,
  size = "md",
  theme = "default",
}: ContentCardProps) {
  // 根据大小设置基础样式
  const sizeClasses = {
    sm: "p-4 text-sm",
    md: "p-6 text-base",
    lg: "p-8 text-lg",
  };

  // 根据主题设置背景样式
  const themeClasses = {
    default: "bg-base-100",
    primary: "bg-primary text-primary-content",
    secondary: "bg-secondary text-secondary-content",
    accent: "bg-accent text-accent-content",
  };

  // 构建完整的样式类名
  const cardClasses = [
    "card w-full",
    shadow ? "shadow-xl" : "",
    "transition-all duration-300 ease-in-out",
    "hover:shadow-2xl hover:scale-[1.02]",
    onClick ? "cursor-pointer" : "",
    themeClasses[theme],
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={cardClasses} onClick={onClick}>
      {/* 图片部分 */}
      {image && (type === "image" || type === "mixed") && (
        <figure className="relative overflow-hidden">
          <img
            src={image}
            alt={imageAlt || title || "Content image"}
            className="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
          />
          {/* 图片上的渐变遮罩，提高文字可读性 */}
          {title && type === "mixed" && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <h2 className="text-white text-xl font-bold">{title}</h2>
            </div>
          )}
        </figure>
      )}

      {/* 内容部分 */}
      <div className={`card-body ${sizeClasses[size]}`}>
        {/* 标题（仅在非mixed类型或无图片时显示） */}
        {title && !(type === "mixed" && image) && (
          <h2 className="card-title text-xl font-bold mb-3 line-clamp-2">
            {title}
          </h2>
        )}

        {/* 文段内容 */}
        {content && (
          <div className="prose prose-sm max-w-none">
            <p className="text-base-content/80 leading-relaxed line-clamp-4">
              {content}
            </p>
          </div>
        )}

        {/* 操作按钮区域（可选） */}
        <div className="card-actions justify-end mt-4">
          {onClick && (
            <button type="button" className="btn btn-primary btn-sm">
              查看详情
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 模块首页卡片容器组件
export function ModuleHomeCardContainer({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-center">{title}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </div>
  );
}

// 示例使用的模块首页组件
export default function ModuleHome() {
  // 轮播图数据 - 五张图片实现循环显示
  const heroImages = [
    {
      img: "https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp",
      alt: "模组创作展示图1",
      title: "探索无限创意",
      description: "发现精彩的模组内容，开启你的创作之旅",
    },
    {
      img: "https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp",
      alt: "模组创作展示图2",
      title: "分享精彩时刻",
      description: "记录每一个难忘的游戏瞬间，与社区分享你的故事",
    },
    {
      img: "https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp",
      alt: "模组创作展示图3",
      title: "创造独特世界",
      description: "用你的想象力构建独一无二的游戏体验",
    },
    {
      img: "https://img.daisyui.com/images/stock/photo-1414694762283-acccc27bca85.webp",
      alt: "模组创作展示图4",
      title: "社区协作",
      description: "与全球创作者一起构建精彩的内容世界",
    },
    {
      img: "https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp",
      alt: "模组创作展示图5",
      title: "创新突破",
      description: "突破传统界限，创造前所未有的游戏体验",
    },
  ];

  // 示例数据
  const textCards = [
    {
      id: "text-1",
      title: "创作灵感",
      content: "在这里，每一个想法都可能成为下一个精彩的故事。让创意在协作中绽放，让故事在共创中升华。",
      type: "text" as const,
      theme: "primary" as const,
    },
    {
      id: "text-2",
      title: "社区协作",
      content: "加入我们的创作社区，与志同道合的创作者一起构建令人惊叹的故事世界。",
      type: "text" as const,
      theme: "secondary" as const,
    },
  ];

  const imageCards = [
    {
      id: "image-1",
      title: "探索无限可能",
      image: "https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp",
      content: "每个模组都是一个独特的世界，等待着玩家去探索和体验。",
      type: "mixed" as const,
    },
    {
      id: "image-2",
      title: "精彩瞬间",
      image: "https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp",
      content: "记录下那些难忘的游戏时光，分享给更多的朋友。",
      type: "mixed" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      {/* 其他内容区域 */}
      <div className="p-8">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">模组创作中心</h1>
        </div>

        {/* 四图并排轮播图区域 */}
        <div className="w-full mb-16">
          <Carousel
            items={heroImages}
            className="w-full"
            autoPlay={true}
            interval={4000}
          />
        </div>

        {/* 文本卡片区域 */}
        <ModuleHomeCardContainer title="创作理念" className="mb-12">
          {textCards.map(card => (
            <ContentCard
              key={card.id}
              title={card.title}
              content={card.content}
              type={card.type}
              theme={card.theme}
              onClick={() => {
                // 处理卡片点击事件
                window.location.href = `/module/${card.id}`;
              }}
            />
          ))}
        </ModuleHomeCardContainer>

        {/* 图片卡片区域 */}
        <ModuleHomeCardContainer title="精选内容" className="mb-12">
          {imageCards.map(card => (
            <ContentCard
              key={card.id}
              title={card.title}
              image={card.image}
              content={card.content}
              type={card.type}
              onClick={() => {
                // 处理卡片点击事件
                window.location.href = `/module/${card.id}`;
              }}
            />
          ))}
        </ModuleHomeCardContainer>

        {/* 纯图片卡片 */}
        <ModuleHomeCardContainer title="视觉画廊">
          <ContentCard
            image="https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp"
            type="image"
            size="lg"
            onClick={() => {
              // 处理图片点击事件
              window.location.href = "/gallery";
            }}
          />
          <ContentCard
            title="纯文本内容"
            content="这是一个纯文本卡片的示例。它展示了如何在没有图片的情况下呈现内容，适合显示重要的文字信息、公告或者简介等。"
            type="text"
            size="md"
            theme="accent"
          />
        </ModuleHomeCardContainer>
      </div>
    </div>
  );
}
