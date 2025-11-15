import Pagination from "@/components/common/pagination";
import { useModuleListQuery } from "api/hooks/moduleQueryHooks";
import { useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import 教室图片 from "./images/教室.webp";

// 卡片内容类型定义
interface ContentCardProps {
  // 可选的图片
  image?: string;
  imageAlt?: string;
  // 标题
  title?: string;
  ruleId?: number; // 规则ID
  // 规则
  RuleName?: string;
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
  ruleId,
  RuleName,
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
    primary: "bg-transparent ",
    secondary: "bg-transparent text-secondary",
    accent: "bg-transparent ",
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
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== 教室图片) {
                target.src = 教室图片;
              }
            }}
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
                      ? `${minTime}-${maxTime}小时`
                      : minTime
                        ? `${minTime}+小时`
                        : maxTime
                          ? `最长${maxTime}小时`
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
        {/* 标题和规则名（所有类型都显示在下方） */}
        {title && (
          <div className="flex items-center justify-between mt-4 mb-3">
            <h2 className="text-lg font-bold line-clamp-2">{title}</h2>
            {ruleId && RuleName && (
              <span className="ml-4 px-2 py-1 text-xs font-semibold bg-accent/10  rounded-full whitespace-nowrap">{RuleName}</span>
            )}
          </div>
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

// 示例使用的模块首页组件
export default function ModuleHome() {
  const navigate = useNavigate();

  const RuleList = useRuleListQuery();

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const itemsPerPage = 12; // 每页显示12个模组

  const ModuleList = useModuleListQuery({
    pageNo: currentPage,
    pageSize: itemsPerPage,
    ruleId: selectedRuleId ?? undefined,
  });

  // 计算分页数据 - 使用 API 数据
  const moduleData = ModuleList.data?.data;
  // console.log("ModuleList data:", moduleData);

  // 先转换数据格式
  const allItems = useMemo(() => {
    if (!moduleData?.list) {
      return [];
    }
    // 将 API 数据转换为 ContentCard 所需的格式
    return moduleData.list
      .filter((module: any) => module.moduleId && module.moduleId !== null && module.moduleId !== "null") // 过滤掉没有moduleId的数据
      .map((module: any) => ({
        id: `module-${module.moduleId}`,
        rule: RuleList.data?.find(rule => rule.ruleId === module.ruleId)?.ruleName ?? "",
        title: module.moduleName,
        image: (module.image && module.image !== null && module.image !== "null") ? module.image : 教室图片, // 更严格的空值检查
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
        readMe: module.readMe, // md字段
      }));
  }, [moduleData, RuleList]);

  // 前端分页（移除搜索过滤）
  const filteredItems = useMemo(() => {
    return allItems;
  }, [allItems]);

  // 计算总页数（使用 API 返回的总记录数）
  const totalPages = useMemo(() => {
    return Math.ceil((moduleData?.totalRecords || 0) / itemsPerPage);
  }, [moduleData?.totalRecords, itemsPerPage]);

  // 当前页显示的数据
  const currentItems = useMemo(() => {
    // 直接使用后端分页返回的数据
    return filteredItems;
  }, [filteredItems]);

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
    ).then(() => { });
  }

  useEffect(() => {
    if (ModuleList.isSuccess && currentItems.length > 0) {
      const imageUrls = currentItems
        .map(item => item.image)
        .filter(url => url && url !== null && url !== undefined && url !== "null"); // 过滤掉空值
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
      {/* 内容区域 */}
      <div className="p-8">

        {/* 图片卡片区域 */}
        <div id="featured-content">
          <div className="max-w-6xl mx-auto mb-12 mt-2 md:mt-8">
            <div className="flex items-center mb-6">
              <h1 className="text-xl md:text-3xl font-bold pl-4 md:pl-8 relative before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 md:before:w-2 before:bg-primary before:rounded-r-md">
                模组列表
              </h1>
              <div className="ml-auto flex items-center gap-2">
                {/* 移动端筛选图标 */}
                <button
                  type="button"
                  className="md:hidden p-2 text-base-content/60 transition-colors"
                  onClick={() => setShowMobileFilter(!showMobileFilter)}
                >
                  <svg className="h-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <g
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeWidth="1.5"
                      fill="none"
                      stroke="currentColor"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </g>
                  </svg>
                </button>
              </div>
            </div>

            <div className="divider"></div>
            {/* 规则列表展示 */}
            <div className={`flex flex-col gap-6 max-w-6xl mx-auto ${showMobileFilter ? "block" : "hidden md:flex"}`}>
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold mb-4">全部规则</h2>
                <div className="flex flex-wrap gap-3">
                  {RuleList.data?.map(rule => (
                    <button
                      key={rule.ruleId}
                      type="button"
                      className={`px-3 py-1 rounded-full text-xs md:text-sm font-semibold border transition-all duration-200 focus:outline-none cursor-pointer ${selectedRuleId === (rule.ruleId ?? null) ? "bg-accent text-white" : "bg-accent/10"}`}
                      onClick={() => {
                        setSelectedRuleId(selectedRuleId === rule.ruleId ? null : rule.ruleId ?? null);
                        setCurrentPage(1);
                      }}
                    >
                      {rule.ruleName ?? "未命名规则"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divider mt-0 mb-8 md:mb-8"></div>
            </div>
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
              {(() => {
                if (ModuleList.isLoading || (currentItems.length !== 0 && !imagesReady)) {
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
                    ruleId={card.ruleId}
                    RuleName={card.rule}
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
                      if (!card.moduleId || card.moduleId === null) {
                        console.error("模组ID为空，无法跳转");
                        return;
                      }
                      navigate(`/module/detail/${card.moduleId}`, {
                        state: {
                          moduleData: {
                            moduleId: card.moduleId,
                            ruleId: card.ruleId, // 所用的规则id
                            ruleName: card.rule, // 所用的规则名称
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
                            readMe: card.readMe, // md字段
                          },
                        },
                      });
                    }}
                  />
                ));
              })()}
            </div>
          </div>
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
