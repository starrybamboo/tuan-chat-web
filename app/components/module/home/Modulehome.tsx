import Pagination from "@/components/common/pagination";
import { useModuleListQuery } from "api/hooks/moduleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

// 导入本地图片
import 办公室图片 from "../scene/images/办公室.webp";
import 天台图片 from "../scene/images/天台.webp";
import 操场图片 from "../scene/images/操场.webp";
import 教室图片 from "../scene/images/教室.webp";
import 楼道图片 from "../scene/images/楼道.webp";

import Carousel from "./carousel";

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
  // 模块相关信息
  authorName?: string;
  createTime?: string;
  minPeople?: number;
  maxPeople?: number;
  minTime?: number;
  maxTime?: number;
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
  authorName,
  createTime,
  minPeople,
  maxPeople,
  minTime,
  maxTime,
  imageOnLoad,
}: ContentCardProps & { imageOnLoad?: () => void }) {
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
            onLoad={imageOnLoad}
          />
          {/* 悬浮时的遮罩 */}
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
          {/* 悬浮时显示的模块详细信息 */}
          {authorName && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end items-start text-black space-y-1">
              <div className="flex items-center text-sm">
                <span className="font-semibold">作者：</span>
                <span className="ml-1">{authorName}</span>
              </div>
              {(minPeople || maxPeople) && (
                <div className="flex items-center text-sm">
                  <span className="font-semibold">人数：</span>
                  <span className="ml-1">
                    {minPeople && maxPeople
                      ? `${minPeople}-${maxPeople}人`
                      : minPeople
                        ? `${minPeople}+人`
                        : maxPeople
                          ? `最多${maxPeople}人`
                          : ""}
                  </span>
                </div>
              )}
              {(minTime || maxTime) && (
                <div className="flex items-center text-sm">
                  <span className="font-semibold">时长：</span>
                  <span className="ml-1">
                    {minTime && maxTime
                      ? `${Math.floor(minTime / 60)}-${Math.floor(maxTime / 60)}分钟`
                      : minTime
                        ? `${Math.floor(minTime / 60)}+分钟`
                        : maxTime
                          ? `最长${Math.floor(maxTime / 60)}分钟`
                          : ""}
                  </span>
                </div>
              )}
              {createTime && (
                <div className="flex items-center text-sm">
                  <span className="font-semibold">创建：</span>
                  <span className="ml-1">{new Date(createTime).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
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
  const navigate = useNavigate();

  // 轮播图数据 - 五张图片实现循环显示
  const heroImages = useMemo(() => [
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
  ], []);

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 每页显示16个模组

  // 当前活跃的背景图片状态
  const [activeBackgroundImage, setActiveBackgroundImage] = useState<string>(
    heroImages.length > 0 ? heroImages[0].img : "",
  );

  // 处理轮播图活跃项变化的回调函数
  const handleActiveImageChange = (activeItem: any) => {
    setActiveBackgroundImage(activeItem.img);
  };

  const ModuleList = useModuleListQuery({
    pageNo: currentPage,
    pageSize: itemsPerPage,
  });

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

  // 计算分页数据 - 使用 API 数据
  const moduleData = ModuleList.data?.data;
  const totalPages = moduleData?.totalRecords ? Math.ceil(moduleData.totalRecords / itemsPerPage) : 1;
  const currentItems = useMemo(() => {
    if (!moduleData?.list) {
      return [];
    }
    // 将 API 数据转换为 ContentCard 所需的格式
    return moduleData.list.map((module: any) => ({
      id: `module-${module.moduleId}`,
      title: module.moduleName,
      image: module.image || 教室图片, // 如果没有图片则使用默认图片
      content: module.description,
      type: "mixed" as const,
      authorName: module.authorName,
      moduleId: module.moduleId,
      ruleId: module.ruleId, // 所用的规则id
      userId: module.userId, // 上传者
      createTime: module.createTime,
      updateTime: module.updateTime, // 修改时间
      minPeople: module.minPeople,
      maxPeople: module.maxPeople,
      minTime: module.minTime,
      maxTime: module.maxTime,
      parent: module.parent, // 从哪个模组fork来
    }));
  }, [moduleData]);

  const [imagesReady, setImagesReady] = useState(false);

  function preloadImages(urls: string[]): Promise<void> {
    return Promise.all(
      urls.map(
        url =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => {
              console.error(`图片加载失败: ${url}`);
              resolve(); // 失败也当加载完处理，防止卡死
            };
          }),
      ),
    ).then(() => {});
  }

  useEffect(() => {
    if (ModuleList.isSuccess && currentItems.length > 0) {
      const imageUrls = currentItems.map(item => item.image);
      preloadImages(imageUrls).then(() => {
        setImagesReady(true);
      });
    }
  }, [ModuleList.isSuccess, currentItems]);
  // 处理页面变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setImagesReady(false); // 关键：每次数据变化先重置
    // 滚动到精选内容区域
    const element = document.getElementById("featured-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="bg-base-100 relative">
      {/* 创建模组按钮 - 右上角绝对定位 */}
      <button
        type="button"
        className="cursor-pointer fixed top-30 right-16 z-50 flex items-center px-4 py-4 border-4 border-primary bg-transparent text-black font-bold text-xl overflow-hidden group transition-all duration-300 hover:border-white"
        onClick={() => navigate("/module/create")}
      >
        {/* 从左往右的黑色背景遮罩 */}
        <div className="absolute inset-0 bg-info transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>

        {/* 按钮内容 - 使用relative和z-10确保在遮罩之上 */}
        <span className="relative z-10 text-primary group-hover:text-white transition-colors duration-300">创建模组</span>
        <svg
          className="w-8 h-8 relative z-10 text-primary group-hover:text-white transition-colors duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
      {/* <div className="fixed top-0 left-0 right-0 z-50 mt-32 ml-8">
        <span className="text-4xl font-black px-8 bg-info py-6 rounded-lg">模组首页</span>
      </div> */}
      {/* 轮播图区域 */}
      {/* 四图并排轮播图区域 */}
      <div className="w-full py-16 bg-base-200 relative overflow-hidden">
        {/* 背景层容器 - 限制模糊效果范围 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          {/* 动态背景图 - 使用当前活跃图片的高斯模糊 */}
          <div
            className="absolute -top-6 -left-6 w-[calc(100%+48px)] h-[calc(100%+48px)] bg-cover bg-center transition-all duration-700 ease-out"
            style={{
              backgroundImage: `url(${activeBackgroundImage || heroImages[0]?.img})`,
              filter: "blur(20px)",
            }}
          />
          {/* 遮罩层 */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/10" />
        </div>

        {/* 轮播图内容 */}
        <div className="relative z-10">
          <Carousel
            items={heroImages}
            className="w-full"
            autoPlay={true}
            interval={4000}
            onActiveChange={handleActiveImageChange}
          />
        </div>
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
            />
          ))}
        </ModuleHomeCardContainer>

        {/* 图片卡片区域 */}
        <div id="featured-content">
          <ModuleHomeCardContainer title="全部模组" className="mb-12 mt-16">
            {(() => {
              if (ModuleList.isLoading || !imagesReady) {
                return Array.from({ length: 8 }, (_, index) => (
                  <div key={`loading-skeleton-${index}-${Math.random()}`} className="animate-pulse">
                    <div className="bg-base-300 aspect-square rounded-none mb-4"></div>
                    <div className="h-4 bg-base-300 rounded mb-2"></div>
                    <div className="h-3 bg-base-300 rounded mb-1"></div>
                    <div className="h-3 bg-base-300 rounded w-2/3"></div>
                  </div>
                ));
              }

              if (ModuleList.isError) {
                return (
                  <div className="col-span-full flex flex-col items-center justify-center py-12">
                    <div className="text-error text-lg mb-2">加载失败</div>
                    <div className="text-base-content/60 text-sm mb-4">请稍后再试</div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => ModuleList.refetch()}
                    >
                      重新加载
                    </button>
                  </div>
                );
              }

              if (currentItems.length === 0) {
                return (
                  <div className="col-span-full flex flex-col items-center justify-center py-12">
                    <div className="text-base-content/60 text-lg mb-2">暂无模组数据</div>
                    <div className="text-base-content/40 text-sm">快来创建第一个模组吧！</div>
                  </div>
                );
              }

              return currentItems.map(card => (
                <ContentCard
                  key={card.id}
                  title={card.title}
                  image={card.image}
                  content={card.content}
                  type={card.type}
                  authorName={card.authorName}
                  createTime={card.createTime}
                  minPeople={card.minPeople}
                  maxPeople={card.maxPeople}
                  minTime={card.minTime}
                  maxTime={card.maxTime}
                  onClick={() => {
                    // 处理卡片点击事件，跳转到模组详情页面并传递数据
                    navigate(`/module/detail/${card.moduleId}`, {
                      state: {
                        moduleData: {
                          moduleId: card.moduleId,
                          ruleId: card.ruleId, // 所用的规则id
                          moduleName: card.title,
                          description: card.content,
                          userId: card.userId, // 上传者
                          authorName: card.authorName, // 作者
                          image: card.image, // 模组封面
                          createTime: card.createTime, // 创建时间
                          updateTime: card.updateTime, // 修改时间
                          minPeople: card.minPeople, // 模组需要人数
                          maxPeople: card.maxPeople,
                          minTime: card.minTime, // 模组可能需要花费时间
                          maxTime: card.maxTime,
                          parent: card.parent, // 从哪个模组fork来
                        },
                      },
                    });
                  }}
                />
              ));
            })()}
          </ModuleHomeCardContainer>
          {/* 分页组件 */}
          {!ModuleList.isLoading && !ModuleList.isError && totalPages > 1 && (
            <div className="mt-8 mb-12 flex justify-center">
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                showNavigation={true}
                responsive={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
