import { RoomContext } from "@/components/chat/roomContext";
import ForwardMessage from "@/components/chat/smallComponents/forwardMessage";
import { SpaceContext } from "@/components/chat/spaceContext";
import CommentPanel from "@/components/common/comment/commentPanel";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import UserAvatarComponent from "@/components/common/userAvatar";
import React, { useMemo } from "react";
import { useGetPostDetailQuery } from "../../../api/hooks/communityQueryHooks";
import { useUserFollowMutation, useUserIsFollowedQuery, useUserUnfollowMutation } from "../../../api/hooks/userFollowQueryHooks";

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

  // 为 ForwardMessage 提供最简化的上下文
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

  return (
    <div className="gap-4 ">
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

      {/* 主要内容区域：封面、标题、正文 */}
      <div className="md:bg-base-100 md:rounded-lg md:p-6 w-full md:card md:shadow-xl">
        {/* 封面图片 */}
        {post?.post?.coverImage && (
          <div className="mb-6 -mx-6 md:mx-0">
            <img
              src={post.post.coverImage}
              alt="封面"
              className="w-full max-h-80 object-cover md:rounded-lg"
            />
          </div>
        )}

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
            <RoomContext value={roomContextValue}>
              <SpaceContext value={spaceContextValue}>
                <ForwardMessage messageResponse={post.post.message} />
              </SpaceContext>
            </RoomContext>
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

      <div className="md:bg-base-100 md:card md:shadow-xl p-4 mt-6 gap-4">
        <p className="text-xl font-semibold">评论</p>
        <CommentPanel targetInfo={{ targetType: "2", targetId: postId }}></CommentPanel>
      </div>
    </div>
  );
}
