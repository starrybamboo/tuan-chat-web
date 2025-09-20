import type { PostListWithStatsResponse } from "api";
import IllegalURLPage from "@/components/common/illegalURLPage";
import UserAvatarComponent from "@/components/common/userAvatar";
import { CommunityContext } from "@/components/community/communityContext";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { useDebounce } from "ahooks";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  usePageCommunityPostsInfiniteQuery,
} from "../../../api/hooks/communityQueryHooks";
import SlidableChatPreview from "./slidableChatPreview";

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
  const navigate = useNavigate();

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
  const [postRef, postEntry] = useIntersectionObserver();
  const FETCH_ON_REMAIN = 2;
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

      {/* Posts List */}
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
          <h3 className="text-xl text-base-content/50 mb-2">
            暂无帖子
          </h3>
          <p className="text-base-content/40">
            成为第一个在此社区发帖的人
          </p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="space-y-5">
          {posts.map((post, index) => {
            const delayClass = index < 5 ? `delay-${(index + 1) * 100}` : "";
            return (
              <div
                key={post?.postListItem?.communityPostId}
                ref={index === posts.length - FETCH_ON_REMAIN ? postRef : null}
                className={`bg-base-100 rounded-2xl border border-base-200 shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:border cursor-pointer group post-item-enter ${delayClass} hover:transform hover:-translate-y-1`}
                style={{ opacity: 0 }} // 初始隐藏，动画会覆盖
              >
                {/* 标题头部 */}
                <div
                  className="flex items-start justify-between mb-4 cursor-pointer"
                  onClick={() => {
                    const postId = post?.postListItem?.communityPostId;
                    if (postId) {
                      if (onPostClick) {
                        onPostClick(postId);
                      }
                      else {
                        navigate(`/community/${communityId}/${postId}`);
                      }
                    }
                  }}
                >
                  <h3 className="text-xl font-bold group-hover:text-info transition-colors line-clamp-2 flex-1 mr-4">
                    {post?.postListItem?.title || "无标题帖子"}
                  </h3>
                </div>

                {/* 帖子内容区域 */}
                <div
                  className="space-y-4"
                  onClick={() => {
                    const postId = post?.postListItem?.communityPostId;
                    if (postId) {
                      if (onPostClick) {
                        onPostClick(postId);
                      }
                      else {
                        navigate(`/community/${communityId}/${postId}`);
                      }
                    }
                  }}
                >
                  {/* 正文内容 */}
                  <div className="w-full">
                    <p className="text-base-content/80 line-clamp-3 break-all lg:break-normal text-sm leading-relaxed">
                      {post?.postListItem?.description}
                    </p>
                  </div>

                  {/* 封面图片和转发消息：智能布局 */}
                  <div className="w-full overflow-hidden">
                    {/* 检查是否有转发消息或封面图片 */}
                    {(post?.postListItem?.message?.message || post?.postListItem?.coverImage) && (
                      <div className="flex gap-2 lg:gap-4 overflow-hidden items-start">
                        {/* 封面图片组件 */}
                        {post?.postListItem?.coverImage && (
                          <div className="w-1/2 overflow-hidden">
                            <div className="rounded-lg overflow-hidden bg-base-200 h-36 lg:h-40">
                              <img
                                src={post.postListItem.coverImage}
                                alt="帖子封面"
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                              />
                            </div>
                          </div>
                        )}

                        {/* 转发消息组件 */}
                        {post?.postListItem?.message?.message && (
                          <div className="w-1/2 overflow-hidden">
                            <div className="rounded-lg overflow-hidden bg-base-200 h-36 lg:h-40">
                              <SlidableChatPreview
                                messageResponse={post?.postListItem?.message}
                                maxHeight="160px"
                                showAvatars={true}
                                beFull={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-base-200/80">
                  {/* 左侧用户信息 */}
                  <div className="flex items-center gap-3">
                    <UserAvatarComponent
                      userId={post?.postListItem?.userId ?? -1}
                      width={6}
                      isRounded={true}
                      withName={true}
                    />
                  </div>

                  {/* 右侧统计信息 TODO: 抽出为统一的组件 */}
                  <div className="flex items-center gap-4 text-sm text-base-content/50">
                    <span className="inline-flex items-center gap-1 jump_icon cursor-pointer">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      <span>{post?.stats?.likeCount ?? 0}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 jump_icon cursor-pointer">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                        />
                      </svg>
                      <span>{post?.stats?.commentCount ?? 0}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 jump_icon cursor-pointer">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                      <span>{post?.stats?.collectionCount ?? 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator for infinite scroll */}
          {pageCommunityPostsQuery.isFetchingNextPage && (
            <div className="flex justify-center py-4 post-fade-in">
              <span className="loading loading-dots loading-lg text-primary"></span>
            </div>
          )}

          {/* End of posts indicator */}
          {!pageCommunityPostsQuery.hasNextPage && posts.length > 0 && (
            <p className="text-center text-base-content/50 py-4 text-sm post-fade-in">你已经浏览完所有帖子啦！</p>
          )}
        </div>
      )}
    </div>
  );
}
