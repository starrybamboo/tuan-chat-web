import type { PostListWithStatsResponse } from "api";
import UserAvatarComponent from "@/components/common/userAvatar";
import React from "react";
import { useNavigate } from "react-router";
import SlidableChatPreview from "./slidableChatPreview";

interface CommunityPostCardProps {
  post: PostListWithStatsResponse;
  index: number;
  communityId?: number;
  onPostClick?: (postId: number) => void;
}

/**
 * 社区帖子卡片组件（预览小卡片）
 */
export default function CommunityPostCard({
  post,
  index,
  communityId,
  onPostClick,
}: CommunityPostCardProps) {
  const navigate = useNavigate();

  const handlePostClick = () => {
    const postId = post?.postListItem?.communityPostId;
    if (postId) {
      if (onPostClick) {
        onPostClick(postId);
      }
      else {
        navigate(`/community/${communityId}/${postId}`);
      }
    }
  };

  const delayClass = index < 5 ? `delay-${(index + 1) * 100}` : "";

  return (
    <div
      className={`bg-base-100 rounded-2xl border border-base-200 shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:border cursor-pointer group post-item-enter ${delayClass} hover:transform hover:-translate-y-1`}
      style={{ opacity: 0 }} // 初始隐藏，动画会覆盖
    >
      {/* 标题头部 */}
      <div className="flex items-start justify-between mb-4 cursor-pointer" onClick={handlePostClick}>
        <h3 className="text-xl font-bold group-hover:text-info transition-colors line-clamp-2 flex-1 mr-4">
          {post?.postListItem?.title || "无标题帖子"}
        </h3>
      </div>

      {/* 帖子内容区域 */}
      <div className="space-y-4" onClick={handlePostClick}>
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

        {/* 右侧统计信息 */}
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
}
