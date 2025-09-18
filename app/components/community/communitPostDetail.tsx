import BetterImg from "@/components/common/betterImg";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import UserAvatarComponent from "@/components/common/userAvatar";
import PostActionBar from "@/components/community/postActionBar";
import PostCommentPanel from "@/components/community/postCommentPanel";
import { useRef, useState } from "react";
import { useGetPostDetailQuery } from "../../../api/hooks/communityQueryHooks";
import { useUserFollowMutation, useUserIsFollowedQuery, useUserUnfollowMutation } from "../../../api/hooks/userFollowQueryHooks";
import SlidableChatPreview from "./slidableChatPreview";

/**
 * 点开帖子后显示的界面，显示帖子详情
 * @param props - 组件属性
 * @param props.postId - 帖子ID
 * @param props.onBack - 返回回调函数，如果提供则显示返回按钮
 * @constructor
 */
export default function CommunityPostDetail({
  postId,
  onBack,
}: {
  postId: number;
  onBack?: () => void;
}) {
  const postDetailQuery = useGetPostDetailQuery(postId);
  const post = postDetailQuery.data?.data;
  const authorId = post?.post?.userId ?? -1;

  // 关注相关hooks
  const isFollowedQuery = useUserIsFollowedQuery(authorId);
  const followMutation = useUserFollowMutation();
  const unfollowMutation = useUserUnfollowMutation();

  const isFollowed = isFollowedQuery.data?.data ?? false;
  const isFollowLoading = followMutation.isPending || unfollowMutation.isPending;

  const handleFollowClick = () => {
    if (isFollowed) {
      unfollowMutation.mutate(authorId);
    }
    else {
      followMutation.mutate(authorId);
    }
  };

  // 回复状态管理
  const [replyTo, setReplyTo] = useState<{ userName: string; commentId: number } | null>(null);

  // 生成对帖子主要内容的引用，用于分享时截图
  const postRef = useRef<HTMLDivElement>(null);
  
  // 加载状态处理
  if (postDetailQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 fade-in-out">
        <span className="loading loading-spinner loading-lg mb-4"></span>
        <p className="text-base-content/60 fade-in-out" style={{ animationDelay: "0.2s" }}>
          正在加载帖子详情...
        </p>
      </div>
    );
  }

  // 错误状态处理
  if (postDetailQuery.isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-16 fade-in-out">
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 18.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h3 className="text-xl text-base-content/50 mb-2 fade-in-out" style={{ animationDelay: "0.3s" }}>
          帖子不存在
        </h3>
        <p className="text-base-content/40 fade-in-out" style={{ animationDelay: "0.4s" }}>
          该帖子可能已被删除或不存在
        </p>
      </div>
    );
  }

  return (
    <div className="gap-4 pb-32 md:pb-4 md:mt-6 md:max-w-3xl md:mx-auto">
      {" "}
      {/* 移动端需要底部padding为固定操作栏留空间，桌面端不需要 */}
      {/* 返回按钮 */}
      {onBack && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-ghost btn-primary btn-sm gap-2 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </div>
      )}

      {/* 封面图片 - 手机端占满屏幕宽度，桌面端与内容卡片宽度一致 */}
      {post?.post?.coverImage && (
        <div className="-mx-4 sm:-mx-6 mb-6 md:mx-auto md:mb-0 md:max-w-3xl">
          <BetterImg
            src={post.post.coverImage}
            className="w-full max-h-80 object-cover md:rounded-lg"
          />
        </div>
      )}

      {/* 主要内容区域：标题、正文等 */}
      <div className="md:bg-base-100 md:rounded-lg w-full md:card md:shadow-xl md:mt-6 md:max-w-3xl md:mx-auto">
        <div className="px-0 md:px-6 py-0 md:py-6" ref={postRef}>
          {/* 标题 */}
          <h2 className="text-2xl font-semibold text-left mb-6">
            {post?.post?.title || "无标题"}
          </h2>

          {/* 作者信息 */}
          <div className="flex flex-row items-center gap-2 mb-4">
            <UserAvatarComponent userId={post?.post?.userId ?? -1} width={10} isRounded={true} withName={true} stopPopWindow={true}></UserAvatarComponent>
            {/* 关注按钮 */}
            {authorId !== -1 && (
              <button
                type="button"
                onClick={handleFollowClick}
                disabled={isFollowLoading}
                className={`btn btn-sm ml-auto ${
                  isFollowed
                    ? "btn-ghost border border-base-300"
                    : "btn-primary"
                } ${isFollowLoading ? "loading" : ""}`}
              >
                {isFollowLoading ? "" : isFollowed ? "已关注" : "关注"}
              </button>
            )}
          </div>

          {/* 转发消息展示 */}
          {post?.post?.message && (
            <div className="mb-6">
              <SlidableChatPreview
                messageResponse={post.post.message}
                maxHeight="400px"
                showAvatars={true}
                beFull={true}
              />
            </div>
          )}

          {/* 正文内容 */}
          <MarkDownViewer content={post?.post?.content ?? ""}></MarkDownViewer>

          {/* 发布时间 */}
          <div className="text-sm text-gray-500 mt-6 pt-4 md:border-t border-base-200">
            发布于
            {" "}
            {new Date(post?.post?.createTime ?? "").toLocaleString()}
          </div>
        </div>
      </div>

      {/* 评论区 - 使用专门的帖子评论组件 */}
      <div className="md:bg-base-100 md:card md:shadow-xl p-4 mt-6 gap-4 md:max-w-3xl md:mx-auto">
        <p className="text-xl font-semibold">评论</p>

        {/* 桌面端：评论操作栏放在评论列表上方 */}
        <div className="hidden md:block mb-4">
          <PostActionBar
            likeTargetInfo={{ targetType: "2", targetId: postId }}
            _commentTargetInfo={{ targetType: "2", targetId: postId }}
            commentCount={post?.stats?.commentCount ?? 0}
            shareSearchKey={`post-${postId}-share`}
            shareTitle={post?.post?.title}
            targetRef={postRef as React.RefObject<HTMLElement>}
            replyTo={replyTo}
            onSetReplyTo={setReplyTo}
          />
        </div>

        <div className="fade-in-out" style={{ animationDelay: "1.2s" }}>
          <PostCommentPanel
            targetInfo={{ targetType: "2", targetId: postId }}
            onReply={(userName, commentId) => {
              setReplyTo({ userName, commentId });
            }}
          />
        </div>
        {/* <CommentPanel targetInfo={{ targetId: postId ?? -1, targetType: "2" }} /> */}
      </div>

      {/* 移动端：底部固定操作栏 */}
      <div className="md:hidden">
        <PostActionBar
          likeTargetInfo={{ targetType: "2", targetId: postId }}
          _commentTargetInfo={{ targetType: "2", targetId: postId }}
          commentCount={post?.stats?.commentCount ?? 0}
          shareSearchKey={`post-${postId}-share`}
          shareTitle={post?.post?.title}
          targetRef={postRef as React.RefObject<HTMLElement>}
          replyTo={replyTo}
          onSetReplyTo={setReplyTo}
        />
      </div>
    </div>
  );
}
