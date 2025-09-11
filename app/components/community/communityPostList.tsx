import type { StoredPost } from "@/components/community/postEditor";
import type { PostListWithStatsResponse } from "api";
import { RoomContext } from "@/components/chat/roomContext";
import ForwardMessage from "@/components/chat/smallComponents/forwardMessage";
import { SpaceContext } from "@/components/chat/spaceContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import IllegalURLPage from "@/components/common/illegalURLPage";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";
import { CommunityContext } from "@/components/community/communityContext";
import PostEditor from "@/components/community/postEditor";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import React, { use, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  usePageCommunityPostsInfiniteQuery,
  usePublishPostMutation,
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

  const navigate = useNavigate();

  const [isPublishWindowOpen, setIsPublishWindowOpen] = useSearchParamsState<boolean>("editPop", false);

  // 为 ChatBubble 提供最简化的上下文
  const roomContextValue = useMemo(() => ({
    roomId: undefined,
    roomMembers: [],
    curMember: undefined,
    roomRolesThatUserOwn: [],
    curRoleId: undefined,
    curAvatarId: undefined,
    useChatBubbleStyle: false,
    spaceId: undefined,
    setReplyMessage: undefined,
    chatHistory: undefined,
    scrollToGivenMessage: undefined,
  }), []);

  const spaceContextValue = useMemo(() => ({
    spaceId: undefined,
    ruleId: undefined,
    isSpaceOwner: false,
    setActiveSpaceId: () => {},
    setActiveRoomId: () => {},
    toggleLeftDrawer: () => {},
  }), []);

  // 无限滚动相关
  const [postRef, postEntry] = useIntersectionObserver();
  const FETCH_ON_REMAIN = 2;
  // 获取帖子列表 - 使用无限查询
  const pageCommunityPostsQuery = usePageCommunityPostsInfiniteQuery({
    communityId,
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

  const publishPostMutation = usePublishPostMutation();
  const handlePublishPost = async (post: StoredPost) => {
    const { title, content } = post;
    if (!title?.trim() || !content?.trim()) {
      return false;
    }
    try {
      await publishPostMutation.mutateAsync({
        communityId,
        title: title.trim(),
        content: content.trim(),
      });
      return true;
    }
    catch (error) {
      toast.error(`发布帖子失败, ${error}`);
      return false;
    }
  };

  if (Number.isNaN(communityId)) {
    return (<IllegalURLPage info="您所找的社区不存在" />);
  }

  return (
    <div className="space-y-8">
      {/* Header with publish button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-base-content">社区帖子</h2>
        <button
          type="button"
          className="btn btn-info gap-2 shadow-lg hover:shadow/30"
          onClick={() => setIsPublishWindowOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          发布新帖
        </button>
      </div>

      {/* Loading State */}
      {pageCommunityPostsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg mb-4"></span>
          <p className="text-base-content/60">正在加载帖子...</p>
        </div>
      )}

      {/* Posts List */}
      {posts.length === 0 && !pageCommunityPostsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-base-300 rounded-box">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-base-content/30 mb-4"
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
          <p className="text-base-content/40 mb-4">成为第一个在此社区发帖的人</p>
          <button type="button" className="btn btn-info btn-sm" onClick={() => setIsPublishWindowOpen(true)}>
            发布帖子
          </button>
        </div>
      )}

      {posts.length > 0 && (
        <div className="space-y-5">
          {posts.map((post, index) => (
            <div
              key={post?.postListItem?.communityPostId}
              ref={index === posts.length - FETCH_ON_REMAIN ? postRef : null}
              className="bg-base-100 rounded-2xl border border-base-200 shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:border cursor-pointer group"
            >
              {/* 标题头部 */}
              <div className="flex items-start justify-between mb-4">
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
                      {/* 转发消息组件 */}
                      {post?.postListItem?.message?.message && (
                        <div className={`${post?.postListItem?.coverImage ? "flex-1 min-w-0 lg:flex-none lg:max-w-md" : "w-full"} overflow-hidden`}>
                          <div className={`rounded-lg overflow-hidden bg-base-200 ${post?.postListItem?.coverImage ? "h-32 lg:h-40" : "h-auto"}`}>
                            <RoomContext value={roomContextValue}>
                              <SpaceContext value={spaceContextValue}>
                                <div className={`w-full h-full overflow-hidden ${post?.postListItem?.coverImage ? "transform scale-90 lg:scale-100 origin-top-left lg:origin-center" : "transform scale-75 origin-top-left"}`}>
                                  <ForwardMessage messageResponse={post?.postListItem?.message} />
                                </div>
                              </SpaceContext>
                            </RoomContext>
                          </div>
                        </div>
                      )}

                      {/* 封面图片组件 */}
                      {post?.postListItem?.coverImage && (
                        <div className={`${post?.postListItem?.message?.message ? "flex-shrink-0 w-32 lg:w-fit" : "w-full"} overflow-hidden`}>
                          <div className={`rounded-lg overflow-hidden bg-base-200 ${post?.postListItem?.message?.message ? "w-32 h-32 lg:w-fit lg:h-40" : "w-full h-32"}`}>
                            <img
                              src={post.postListItem.coverImage}
                              alt="帖子封面"
                              className={`h-full object-cover group-hover:scale-105 transition-transform duration-300 ${post?.postListItem?.message?.message ? "w-32 lg:w-auto" : "w-full"}`}
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
                  <span className="inline-flex items-center gap-1">
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

                  <span className="inline-flex items-center gap-1">
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

                  <span className="inline-flex items-center gap-1">
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
          ))}

          {/* Loading indicator for infinite scroll */}
          {pageCommunityPostsQuery.isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <span className="loading loading-dots loading-lg text-primary"></span>
            </div>
          )}

          {/* End of posts indicator */}
          {!pageCommunityPostsQuery.hasNextPage && posts.length > 0 && (
            <p className="text-center text-base-content/50 py-4 text-sm">你已经浏览完所有帖子啦！</p>
          )}
        </div>
      )}

      {/* Publish Window */}
      <PopWindow
        isOpen={isPublishWindowOpen}
        onClose={() => setIsPublishWindowOpen(false)}
        fullScreen
      >
        <PostEditor
          onClose={() => setIsPublishWindowOpen(false)}
          onSubmit={handlePublishPost}
        />
      </PopWindow>
    </div>
  );
}
