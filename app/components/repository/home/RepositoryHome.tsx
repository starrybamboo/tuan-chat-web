import type { ReactNode } from "react";
import { useRepositoryListQuery } from "api/hooks/repositoryQueryHooks";
import { useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Pagination from "@/components/common/pagination";
import { imageMediumUrlFromUrl } from "@/utils/mediaUrl";

const EMPTY_STRING_LIST: string[] = [];

// 卡片内容类型定义
interface ContentCardProps {
  // 可选的图片
  image?: string;
  imageAlt?: string;
  imageLoading?: "eager" | "lazy";
  imageDecoding?: "async" | "auto" | "sync";
  imageFetchPriority?: "high" | "low" | "auto";
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
  badgeLabel?: string;
  topBadges?: string[];
  subtitle?: string;
  metadata?: string[];
  hoverMetadata?: string[];
  imageAspect?: "square" | "landscape" | "wide";
  placeholder?: ReactNode;
  titleSuffix?: ReactNode;
  bottomSlot?: ReactNode;
  hoverHint?: string;
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
  badgeLabel,
  topBadges = EMPTY_STRING_LIST,
  subtitle,
  metadata = EMPTY_STRING_LIST,
  hoverMetadata = EMPTY_STRING_LIST,
  imageAspect = "square",
  placeholder,
  titleSuffix,
  bottomSlot,
  hoverHint,
  imageLoading = "lazy",
  imageDecoding = "async",
  imageFetchPriority = "auto",
  imageOnLoad,
}: ContentCardProps & { imageOnLoad?: () => void }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const displayImage = imageMediumUrlFromUrl(image);
  const hasImageError = Boolean(displayImage && failedImage === displayImage);

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
  const aspectClasses = {
    square: "aspect-square",
    landscape: "aspect-[4/3]",
    wide: "aspect-[1.25/1]",
  };
  const resolvedBadgeLabel = badgeLabel ?? (ruleId && RuleName ? RuleName : undefined);
  const shouldRenderVisual = type === "image" || type === "mixed";
  const shouldShowImage = Boolean(displayImage && !hasImageError && shouldRenderVisual);
  const shouldShowPlaceholder = Boolean(!shouldShowImage && placeholder && shouldRenderVisual);
  const shouldShowHoverMeta = Boolean(authorName || createTime || minPeople || maxPeople || minTime || maxTime || hoverMetadata.length > 0);

  // 构建完整的样式类名
  const cardClasses = [
    "w-full group rounded-md",
    "transition-all duration-300 ease-in-out",
    onClick ? "cursor-pointer" : "",
    themeClasses[theme],
    className,
  ].filter(Boolean).join(" ");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick)
      return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* 图片部分 */}
      {(shouldShowImage || shouldShowPlaceholder) && (
        <figure className={`relative overflow-hidden rounded-md border border-gray-300 dark:border-gray-700 bg-base-200 ${aspectClasses[imageAspect]}`}>
          {shouldShowImage && (
            <img
              src={displayImage}
              alt={imageAlt || title || "Content image"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              loading={imageLoading}
              decoding={imageDecoding}
              fetchPriority={imageFetchPriority}
              onLoad={() => {
                if (failedImage === displayImage) {
                  setFailedImage(null);
                }
                imageOnLoad?.();
              }}
              onError={() => setFailedImage(displayImage ?? null)}
            />
          )}
          {shouldShowPlaceholder && (
            <div className="flex h-full w-full items-center justify-center">
              {placeholder}
            </div>
          )}

          {(topBadges.length > 0 || hoverHint) && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
              <div className="flex flex-wrap gap-2">
                {topBadges.map(label => (
                  <span
                    key={label}
                    className="rounded-full border border-base-300 bg-base-100/88 px-2 py-0.5 text-[10px] font-semibold text-base-content shadow-sm backdrop-blur-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {hoverHint && (
                <span className="translate-y-1 rounded-md bg-base-100/88 px-2 py-1 text-[11px] font-semibold text-base-content opacity-0 shadow-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 backdrop-blur-sm">
                  {hoverHint}
                </span>
              )}
            </div>
          )}

          {shouldShowHoverMeta && (
            <>
              <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-40 dark:bg-black dark:group-hover:opacity-20" />
              <div className="pointer-events-none absolute inset-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end items-start">
                <div className="space-y-3 text-sm text-black dark:text-white">
                  {hoverMetadata.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hoverMetadata.map(item => (
                        <span
                          key={item}
                          className="rounded-full border border-black/12 bg-white/75 px-2.5 py-0.5 text-[11px] font-medium text-black/78 backdrop-blur-sm dark:border-white/12 dark:bg-black/55 dark:text-white/82"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {authorName && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">作者</span>
                      <span className="truncate">{authorName}</span>
                    </div>
                  )}
                  {(minPeople || maxPeople) && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">人数</span>
                      <span>
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">时长</span>
                      <span>
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">创建</span>
                      <span>{new Date(createTime).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </figure>
      )}

      <div className={`px-1 ${sizeClasses[size]}`}>
        {(title || resolvedBadgeLabel || titleSuffix) && (
          <div className={`${shouldRenderVisual ? "mt-4" : ""} flex items-start justify-between gap-3`}>
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-lg font-bold leading-7 line-clamp-2">{title}</h2>}
              {subtitle && (
                <p className="mt-1 text-sm text-base-content/55 line-clamp-2">
                  {subtitle}
                </p>
              )}
            </div>
            {(titleSuffix || resolvedBadgeLabel) && (
              <div className="flex shrink-0 items-center gap-2">
                {titleSuffix}
                {resolvedBadgeLabel && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-base-content/80">
                    {resolvedBadgeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {content && (
          <div className="prose prose-sm mt-3 max-w-none">
            <p className="text-sm leading-relaxed text-base-content/80 line-clamp-4">
              {content}
            </p>
          </div>
        )}

        {metadata.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {metadata.map(item => (
              <span
                key={item}
                className="rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[11px] text-base-content/65"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        {bottomSlot && (
          <div className="mt-4">
            {bottomSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// 示例使用的模块首页组件
export default function RepositoryHome() {
  const navigate = useNavigate();

  interface RepositoryCard {
    id: string;
    rule: string;
    title: string;
    image?: string;
    content?: string;
    type: "mixed";
    authorName?: string;
    repositoryId: number;
    ruleId?: number;
    userId?: number;
    createTime?: string;
    updateTime?: string;
    minPeople?: number;
    maxPeople?: number;
    minTime?: number;
    maxTime?: number;
    parent?: unknown;
    readMe?: unknown;
  }

  const RuleList = useRuleListQuery();

  // 分页状态管理
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const itemsPerPage = 12; // 每页显示12个仓库

  const repositoryList = useRepositoryListQuery({
    pageNo: currentPage,
    pageSize: itemsPerPage,
    ruleId: selectedRuleId ?? undefined,
  });

  // 计算分页数据 - 使用 API 数据
  const repositoryData = repositoryList.data?.data;
  // console.log("repositoryList data:", repositoryData);

  // 先转换数据格式
  const allItems = useMemo(() => {
    if (!repositoryData?.list) {
      return [] as RepositoryCard[];
    }
    // 将 API 数据转换为 ContentCard 所需的格式
    return repositoryData.list
      .filter((repository: any) => repository.repositoryId && repository.repositoryId !== null && repository.repositoryId !== "null") // 过滤掉没有repositoryId的数据
      .map((repository: any) => ({
        id: `repository-${repository.repositoryId}`,
        rule: RuleList.data?.find(rule => rule.ruleId === repository.ruleId)?.ruleName ?? "",
        title: String(repository.repositoryName ?? ""),
        image: (repository.image && repository.image !== null && repository.image !== "null") ? String(repository.image) : undefined, // 更严格的空值检查
        content: repository.description,
        type: "mixed" as const,
        authorName: repository.authorName,
        repositoryId: Number(repository.repositoryId),
        ruleId: repository.ruleId, // 所用的规则id
        userId: repository.userId, // 上传者
        createTime: repository.createTime,
        updateTime: repository.updateTime, // 修改时间
        minPeople: repository.minPeople,
        maxPeople: repository.maxPeople,
        minTime: repository.minTime,
        maxTime: repository.maxTime,
        parent: repository.parentRepositoryId, // 从哪个仓库fork来
        readMe: repository.readMe, // md字段
      })) as RepositoryCard[];
  }, [repositoryData, RuleList]);

  // 前端分页（移除搜索过滤）
  const filteredItems = useMemo(() => {
    return allItems;
  }, [allItems]);

  // 计算总页数（使用 API 返回的总记录数）
  const totalPages = useMemo(() => {
    return Math.ceil((repositoryData?.totalRecords || 0) / itemsPerPage);
  }, [repositoryData?.totalRecords, itemsPerPage]);

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
    if (repositoryList.isSuccess && currentItems.length > 0) {
      const imageUrls = currentItems
        .map((item: RepositoryCard) => imageMediumUrlFromUrl(item.image))
        .filter((url): url is string => typeof url === "string" && url.length > 0 && url !== "null"); // 过滤掉空值
      preloadImages(imageUrls).then(() => {
        setImagesReady(true);
      });
    }
  }, [repositoryList.isSuccess, currentItems]);
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
                仓库列表
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
                if (repositoryList.isLoading || (currentItems.length !== 0 && !imagesReady)) {
                  return Array.from({ length: 8 }, (_, index) => (
                    <div key={`loading-skeleton-${index}`} className="animate-pulse">
                      <div className="bg-base-300 aspect-square rounded-none mb-4"></div>
                      <div className="h-4 bg-base-300 rounded mb-2"></div>
                      <div className="h-3 bg-base-300 rounded mb-1"></div>
                      <div className="h-3 bg-base-300 rounded w-2/3"></div>
                    </div>
                  ));
                }

                if (repositoryList.isError) {
                  return (
                    <div className="col-span-full flex flex-col items-center justify-center py-12">
                      <div className="text-error text-lg mb-2">加载失败</div>
                      <div className="text-base-content/60 text-sm mb-4">请稍后再试</div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => repositoryList.refetch()}
                      >
                        重新加载
                      </button>
                    </div>
                  );
                }

                if (currentItems.length === 0) {
                  return (
                    <div className="col-span-full flex flex-col items-center justify-center py-12">
                      <div className="text-base-content/60 text-lg mb-2">暂无仓库数据</div>
                      <div className="text-base-content/40 text-sm">快来创建第一个仓库吧！</div>
                    </div>
                  );
                }

                return currentItems.map((card: RepositoryCard) => (
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
                      // 处理卡片点击事件，跳转到仓库详情页面并传递数据
                      if (!card.repositoryId || card.repositoryId === null) {
                        console.error("仓库ID为空，无法跳转");
                        return;
                      }
                      navigate(`/repository/detail/${card.repositoryId}`, {
                        state: {
                          repositoryData: {
                            repositoryId: card.repositoryId,
                            ruleId: card.ruleId, // 所用的规则id
                            ruleName: card.rule, // 所用的规则名称
                            repositoryName: card.title,
                            description: card.content,
                            userId: card.userId, // 上传者
                            authorName: card.authorName, // 作者
                            image: card.image, // 仓库封面
                            createTime: card.createTime, // 创建时间
                            updateTime: card.updateTime, // 修改时间
                            minPeople: card.minPeople, // 仓库需要人数
                            maxPeople: card.maxPeople,
                            minTime: card.minTime, // 仓库可能需要花费时间
                            maxTime: card.maxTime,
                            parent: card.parent, // 从哪个仓库fork来
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
          {!repositoryList.isLoading && !repositoryList.isError && totalPages > 1 && (
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
