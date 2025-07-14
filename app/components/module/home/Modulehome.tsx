import React from "react";
import Carousel from "../carousel";

// 导入本地图片
import 办公室图片 from "../scene/images/办公室.jpg";
import 天台图片 from "../scene/images/天台.jpg";
import 操场图片 from "../scene/images/操场.jpg";
import 教室图片 from "../scene/images/教室.jpg";
import 楼道图片 from "../scene/images/楼道.jpg";

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
  size = "md",
  theme = "default",
}: ContentCardProps) {
  // 根据大小设置基础样式
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // 根据主题设置背景样式
  const themeClasses = {
    default: "bg-transparent",
    primary: "bg-transparent text-primary",
    secondary: "bg-transparent text-secondary",
    accent: "bg-transparent text-accent",
  };

  // 构建完整的样式类名
  const cardClasses = [
    "w-full rounded-none group", // 改为直角，去掉card类的默认圆角，添加group类
    "transition-all duration-300 ease-in-out",
    onClick ? "cursor-pointer" : "",
    themeClasses[theme],
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={cardClasses} onClick={onClick}>
      {/* 图片部分 */}
      {image && (type === "image" || type === "mixed") && (
        <figure className="relative overflow-hidden rounded-none">
          <img
            src={image}
            alt={imageAlt || title || "Content image"}
            className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110 rounded-none"
          />
          {/* 悬浮时的遮罩 */}
          <div className="absolute inset-0 bg-base-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </figure>
      )}

      {/* 内容部分 */}
      <div className={`${sizeClasses[size]}`}>
        {/* 标题（所有类型都显示在下方） */}
        {title && (
          <h2 className="text-lg font-bold mt-4 mb-3 line-clamp-2">
            {title}
          </h2>
        )}

        {/* 文段内容 */}
        {content && (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-base-content/80 leading-relaxed line-clamp-4">
              {content}
            </p>
          </div>
        )}
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
    <div className={`max-w-6xl mx-auto ${className}`}>
      {title && (
        <h1 className="text-3xl font-bold mb-6 pl-8 relative before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-2 before:bg-primary before:rounded-r-md">
          {title}
        </h1>
      )}
      <div className="divider mb-8"></div>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
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
      img: 教室图片,
      alt: "教室场景",
      title: "探索无限创意",
      description: "发现精彩的模组内容，开启你的创作之旅",
    },
    {
      img: 操场图片,
      alt: "操场场景",
      title: "分享精彩时刻",
      description: "记录每一个难忘的游戏瞬间，与社区分享你的故事",
    },
    {
      img: 办公室图片,
      alt: "办公室场景",
      title: "创造独特世界",
      description: "用你的想象力构建独一无二的游戏体验",
    },
    {
      img: 天台图片,
      alt: "天台场景",
      title: "社区协作",
      description: "与全球创作者一起构建精彩的内容世界",
    },
    {
      img: 楼道图片,
      alt: "楼道场景",
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
      theme: "default" as const,
    },
    {
      id: "text-2",
      title: "社区协作",
      content: "加入我们的创作社区，与志同道合的创作者一起构建令人惊叹的故事世界。",
      type: "text" as const,
      theme: "default" as const,
    },
    {
      id: "text-3",
      title: "技术创新",
      content: "运用最新的技术和工具，打造更加流畅和沉浸式的游戏体验，让每一个细节都完美呈现。",
      type: "text" as const,
      theme: "default" as const,
    },
    {
      id: "text-4",
      title: "开放生态",
      content: "构建开放包容的创作生态，让每个人都能找到属于自己的创作方式和表达空间。",
      type: "text" as const,
      theme: "default" as const,
    },
  ];

  const imageCards = [
    {
      id: "module-1",
      title: "校园生活模组",
      image: 教室图片,
      content: "体验真实的校园生活，包含课堂互动、社团活动和校园探索等丰富内容。",
      type: "mixed" as const,
    },
    {
      id: "module-2",
      title: "运动竞技模组",
      image: 操场图片,
      content: "参与各种体育竞技活动，挑战自我极限，享受运动带来的快乐与成就感。",
      type: "mixed" as const,
    },
    {
      id: "module-3",
      title: "职场模拟模组",
      image: 办公室图片,
      content: "模拟真实职场环境，学习职业技能，体验不同行业的工作流程和挑战。",
      type: "mixed" as const,
    },
    {
      id: "module-4",
      title: "社交互动模组",
      image: 天台图片,
      content: "在轻松的环境中与他人互动交流，建立友谊，分享生活中的点点滴滴。",
      type: "mixed" as const,
    },
    {
      id: "module-5",
      title: "探险解谜模组",
      image: 楼道图片,
      content: "在神秘的环境中探索未知，解决各种谜题，发现隐藏的秘密和宝藏。",
      type: "mixed" as const,
    },
    {
      id: "module-6",
      title: "创意建造模组",
      image: 教室图片,
      content: "发挥无限创意，自由建造和设计，打造属于自己的独特世界空间。",
      type: "mixed" as const,
    },
    {
      id: "module-7",
      title: "角色扮演模组",
      image: 办公室图片,
      content: "扮演不同角色，体验多样人生，在虚拟世界中实现各种可能性。",
      type: "mixed" as const,
    },
    {
      id: "module-8",
      title: "策略经营模组",
      image: 天台图片,
      content: "运用策略思维，经营管理各种资源，在竞争中获得成功和发展。",
      type: "mixed" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* <div className="fixed top-0 left-0 right-0 z-50 mt-32 ml-8">
        <span className="text-4xl font-black px-8 bg-info py-6 rounded-lg">模组首页</span>
      </div> */}
      {/* 轮播图区域 */}
      {/* 四图并排轮播图区域 */}
      <div className="w-full py-16 bg-base-200 relative">
        <Carousel
          items={heroImages}
          className="w-full"
          autoPlay={true}
          interval={4000}
        />
      </div>
      {/* 其他内容区域 */}
      <div className="p-8">
        {/* 文本卡片区域 */}
        <ModuleHomeCardContainer title="" className="mb-12">
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
        <ModuleHomeCardContainer title="精选内容" className="mb-12 mt-16">
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
        {/* <ModuleHomeCardContainer title="视觉画廊">
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
            theme="primary"
          />
          <ContentCard
            image="https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp"
            type="image"
            size="md"
            onClick={() => {
              window.location.href = "/gallery/2";
            }}
          />
          <ContentCard
            title="社区动态"
            content="关注最新的社区动态和更新，了解平台的发展方向和新功能发布。与其他创作者保持联系，共同成长。"
            type="text"
            size="md"
            theme="primary"
          />
        </ModuleHomeCardContainer> */}
      </div>
    </div>
  );
}
