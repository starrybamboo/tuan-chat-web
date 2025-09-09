import type { FeedStatsResponse, MessageFeedResponse } from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import CommentPanel from "@/components/common/comment/commentPanel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import LikeIconButton from "@/components/common/likeIconButton";
import ShareIconButton from "@/components/common/shareIconButton";
import UserAvatarComponent from "@/components/common/userAvatar";
import { EllipsisVertical } from "@/icons";
import React from "react";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";
import CollectionIconButton from "../common/collection/collectionIconButton";
import CommentIconButton from "../common/comment/commentIconButton";
import DislikeIconButton from "../common/dislikeIconButton";

interface FeedPreviewProps {
  feed: MessageFeedResponse;
  stats: FeedStatsResponse;
  onDislike?: () => void;
}

export default function FeedPreview({ feed, stats, onDislike }: FeedPreviewProps) {
  const { data: messageResponse, isLoading } = useGetMessageByIdQuery(feed?.messageId ?? -1);
  const [showComments, setShowComments] = useSearchParamsState<boolean>(
    `feedShowCommentsPop${feed?.feedId}`,
    false,
  );

  const [showMoreOptions, setShowMoreOptions] = React.useState(false);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md mb-4 hover:shadow-sm transition-shadow w-full">
      <div className="card-body p-4 md:p-6 flex flex-col relative">
        {/* 头部 - 包含头像和标题 */}
        <div className="flex items-center gap-3 mb-2">
          <UserAvatarComponent
            userId={feed?.userId ?? -1}
            width={10}
            isRounded={true}
            withName={false}
          />
          <div className="flex-1">
            <h2 className="card-title text-base-content text-lg leading-tight">
              {feed.title || "未命名动态"}
            </h2>
            {feed.userId && (
              <p className="text-sm text-base-content/60">
                用户ID:
                {" "}
                {feed.userId}
              </p>
            )}
          </div>
        </div>

        {/* 聊天消息/图片 */}
        <div className="flex-1 overflow-y-auto mb-4">
          {isLoading
            ? (
                <div className="text-sm text-base-content/40">加载中...</div>
              )
            : (
                messageResponse && (
                  <ChatBubble chatMessageResponse={messageResponse} useChatBubbleStyle={true} />
                )
              )}
        </div>

        {/* 正文内容 */}
        {feed.description && (
          <p className="text-base-content/80 text-sm mb-4 whitespace-pre-line">
            {feed.description}
          </p>
        )}

        {/* 底部操作栏 */}
        <div className="flex justify-between items-center mt-auto">
          <div className="join items-end">
            <LikeIconButton
              targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "1" }}
              className="flex items-center justify-center join-item btn btn-sm btn-ghost"
              direction="row"
            />
            <CommentIconButton
              feedId={feed.feedId!}
              commentCount={stats.commentCount}
              showComments={showComments}
              onToggle={() => setShowComments(!showComments)}
            />
            <ShareIconButton searchKey={`feedShowSharePop${feed?.feedId}`} />
          </div>

          {/* 更多操作 */}
          <div
            className="relative flex flex-col items-end gap-1"
            onMouseEnter={() => setShowMoreOptions(true)}
            onMouseLeave={() => setShowMoreOptions(false)}
          >
            <div
              className="relative"

            >
              <button className="btn btn-sm btn-ghost rounded-full p-2" type="button">
                <EllipsisVertical className="w-6 h-6" />
              </button>

              {/* 悬浮菜单 */}
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-1 w-24 bg-base-100 border border-base-300 shadow-md rounded-md z-50">
                  <CollectionIconButton
                    targetInfo={{ resourceId: feed.feedId!, resourceType: "feed" }}
                    className="w-full justify-start px-2 py-2 text-sm cursor-pointer hover:bg-base-200"
                  />
                  <DislikeIconButton
                    className="w-full justify-start px-2 py-2 text-sm cursor-pointer hover:bg-base-200"
                    onDislike={onDislike}
                  />
                </div>
              )}

            </div>

            {(feed.createTime || feed.messageId) && (
              <div className="text-xs text-base-content/50 space-x-2 flex mt-1">
                {feed.messageId && (
                  <span className="text-[10px]">
                    消息ID:
                    {feed.messageId}
                  </span>
                )}
                {feed.createTime && <span className="text-[10px]">{feed.createTime}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 评论区，在showComments为true时直接展开 */}
      {showComments && (
        <div className="p-4 bg-base-200 border-t border-base-300">
          <CommentPanel
            targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "1" }}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}
