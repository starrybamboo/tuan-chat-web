import type { CommunityContextType } from "@/components/community/communityContext";
import CommunityPostDetail from "@/components/community/communitPostDetail";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityPostList from "@/components/community/communityPostList";
import { UsersIcon } from "@/icons";
import React, { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useListCommunitiesQuery } from "../../../api/hooks/communityQueryHooks";

/**
 * 社区界面
 */
export default function CommunityPage() {
  const { communityId: urlCommunityId, postId: urlPostId } = useParams();
  const communityId = Number(urlCommunityId);
  const postId = urlPostId ? Number(urlPostId) : undefined;

  // 获取社区列表和当前社区信息
  const listCommunitiesQuery = useListCommunitiesQuery();
  const communityList = useMemo(() => {
    return listCommunitiesQuery.data?.data ?? [];
  }, [listCommunitiesQuery.data?.data]);

  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const communityContext: CommunityContextType = useMemo(() => {
    return { communityId };
  }, [communityId]);

  // 滚动到左侧
  const scrollLeft = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: "smooth" });
    }
  }, []);

  // 滚动到右侧
  const scrollRight = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: "smooth" });
    }
  }, []);

  // 初始化滚动状态
  React.useEffect(() => {
    const updateScrollState = () => {
      const container = scrollContainerRef.current;
      if (container) {
        const canLeft = container.scrollLeft > 0;
        const canRight = container.scrollLeft < container.scrollWidth - container.clientWidth - 1;

        setCanScrollLeft(canLeft);
        setCanScrollRight(canRight);
      }
    };

    // 延迟执行以确保DOM已更新
    const timeoutId = setTimeout(updateScrollState, 100);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollState);
      return () => {
        clearTimeout(timeoutId);
        container.removeEventListener("scroll", updateScrollState);
      };
    }

    return () => clearTimeout(timeoutId);
  }, [communityList]);

  if (listCommunitiesQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg "></span>
      </div>
    );
  }

  return (
    <CommunityContext value={communityContext}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* 顶部社区列表 */}
        <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-4 lg:p-6">
          {communityList.length > 0
            ? (
                <div className="relative">
                  {/* 桌面端左侧滚动按钮 */}
                  {canScrollLeft && (
                    <button
                      type="button"
                      onClick={scrollLeft}
                      className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full items-center justify-center text-white hover:bg-black/30 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}

                  {/* 桌面端右侧滚动按钮 */}
                  {canScrollRight && (
                    <button
                      type="button"
                      onClick={scrollRight}
                      className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/20 backdrop-blur-sm rounded-full items-center justify-center text-white hover:bg-black/30 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  {/* 社区列表滚动容器 */}
                  <div
                    ref={scrollContainerRef}
                    className="flex gap-4 lg:gap-6 overflow-x-auto scrollbar-hide py-2 px-2 lg:px-12"
                    style={{
                      scrollSnapType: "x mandatory",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      // WebkitScrollbar: 'none'
                    }}
                  >
                    {communityList.map(community => (
                      <Link
                        key={community.communityId}
                        to={`/community/${community.communityId}`}
                        className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
                        style={{ scrollSnapAlign: "start" }}
                      >
                        {/* 圆形社区头像 - 模仿小黑盒风格 */}
                        <div className="relative mb-2">
                          <div className={`w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-3 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg ${
                            community.communityId === communityId
                              ? "border-primary shadow-lg shadow-primary/20"
                              : "border-base-300 group-hover:border-primary/50"
                          }`}
                          >
                            <img
                              src={community.avatar}
                              alt={community.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const parent = e.currentTarget.parentElement;
                                if (parent && community.name) {
                                  parent.classList.add("flex", "items-center", "justify-center", "bg-gradient-to-br", "from-primary/20", "to-secondary/20");
                                  parent.innerHTML = `<div class="text-xl lg:text-2xl font-bold text-primary">${community.name.charAt(0)}</div>`;
                                }
                              }}
                            />
                          </div>

                          {/* 当前选中的社区指示器 */}
                          {community.communityId === communityId && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary border-2 border-base-100 shadow-sm"></div>
                          )}
                        </div>

                        {/* 社区名称 */}
                        <div className="text-center max-w-20 lg:max-w-24">
                          <p className={`text-xs lg:text-sm font-medium line-clamp-2 transition-colors ${
                            community.communityId === communityId
                              ? "text-primary"
                              : "text-base-content/70 group-hover:text-primary"
                          }`}
                          >
                            {community.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            : (
                <div className="py-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-200 mb-4">
                    <UsersIcon className="h-8 w-8 text-base-content/40" />
                  </div>
                  <p className="text-base-content/60 text-lg">暂无社区</p>
                  <p className="text-base-content/40 text-sm mt-1">等待更多精彩社区的加入</p>
                </div>
              )}
        </div>

        {/* 主内容区 */}
        <div className="flex-1 min-w-0">
          {postId
            ? (
                <CommunityPostDetail postId={postId} />
              )
            : (
                <CommunityPostList />
              )}
        </div>
      </div>
    </CommunityContext>
  );
}
