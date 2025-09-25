import type { PostListWithStatsResponse } from "api";
import IllegalURLPage from "@/components/common/illegalURLPage";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityPostCard from "@/components/community/communityPostCard";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { useDebounce } from "ahooks";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
import {
  usePageCommunityPostsInfiniteQuery,
} from "../../../api/hooks/communityQueryHooks";

const PAGE_SIZE = 10;

interface CommunityPostListProps {
  onPostClick?: (postId: number) => void;
}

/**
 * 社区帖子列表
 * @constructor
 */
export default function CommunityPostList({ onPostClick }: CommunityPostListProps = {}) {
  const communityContext = use(CommunityContext);
  const communityId = communityContext.communityId ?? -1;

  // 用于管理切换动画的状态
  const [displayedCommunityId, setDisplayedCommunityId] = useState(communityId);
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 对社区ID进行防抖处理，防止快速切换社区时发送过多请求
  const debouncedCommunityId = useDebounce(communityId, { wait: 300 });

  // 监听社区ID变化，触发切换动画
  useEffect(() => {
    if (debouncedCommunityId === displayedCommunityId || Number.isNaN(debouncedCommunityId)) {
      return;
    }

    // 触发退出动画
    const exitTimer = setTimeout(() => setIsExiting(true), 0);

    // 退出动画完成后切换到新社区
    const switchTimer = setTimeout(() => {
      setDisplayedCommunityId(debouncedCommunityId);
      setIsExiting(false);
    }, 300); // 与CSS exit动画时长一致

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(switchTimer);
    };
  }, [debouncedCommunityId, displayedCommunityId]);

  // 无限滚动相关
  const [, postEntry] = useIntersectionObserver();
  // const FETCH_ON_REMAIN = 2;

  // 获取帖子列表 - 使用无限查询
  const pageCommunityPostsQuery = usePageCommunityPostsInfiniteQuery({
    communityId: displayedCommunityId,
    pageSize: PAGE_SIZE,
  });

  // 将分页数据 flatten
  const posts: PostListWithStatsResponse[] = useMemo(() => {
    return pageCommunityPostsQuery.data?.pages.flatMap(p => p.data?.list ?? []) ?? [];
  }, [pageCommunityPostsQuery.data?.pages]);

  // 无限滚动逻辑
  useEffect(() => {
    if (postEntry?.isIntersecting && !pageCommunityPostsQuery.isFetching && pageCommunityPostsQuery.hasNextPage) {
      void pageCommunityPostsQuery.fetchNextPage();
    }
  }, [postEntry?.isIntersecting, pageCommunityPostsQuery.isFetching, pageCommunityPostsQuery.hasNextPage, pageCommunityPostsQuery]);

  if (Number.isNaN(communityId)) {
    return (<IllegalURLPage info="您所找的社区不存在" />);
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-8 max-w-2xl mx-auto w-full lg:max-w-3xl ${
        isExiting ? "community-exit" : "community-enter"
      }`}
    >
      {/* Loading State */}
      {pageCommunityPostsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg mb-4"></span>
          <p className="text-base-content/60">正在加载帖子...</p>
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && !pageCommunityPostsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-base-300 rounded-box post-fade-in">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-base-content/30 mb-4 animate-scale-in"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl text-base-content/50 mb-2">暂无帖子</h3>
          <p className="text-base-content/40">成为第一个在此社区发帖的人</p>
        </div>
      )}

      {/* Posts List */}
      {posts.length > 0 && (
        <div className="space-y-5">
          {posts.map((post, index) => (
            <CommunityPostCard
              key={post?.postListItem?.communityPostId}
              post={post}
              index={index}
              communityId={communityId}
              onPostClick={onPostClick}
            />
          ))}

          {/* Loading indicator for infinite scroll */}
          {pageCommunityPostsQuery.isFetchingNextPage && (
            <div className="flex justify-center py-4 post-fade-in">
              <span className="loading loading-dots loading-lg text-primary"></span>
            </div>
          )}

          {/* End of posts indicator */}
          {!pageCommunityPostsQuery.hasNextPage && posts.length > 0 && (
            <p className="text-center text-base-content/50 py-4 text-sm post-fade-in">
              你已经浏览完所有帖子啦！
            </p>
          )}
        </div>
      )}
    </div>
  );
}
