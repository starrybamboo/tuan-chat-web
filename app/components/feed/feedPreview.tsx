import type { FeedStatsResponse, MessageFeedResponse } from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import CommentPanel from "@/components/common/comment/commentPanel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import LikeIconButton from "@/components/common/likeIconButton";
import ShareIconButton from "@/components/common/shareIconButton";
import UserAvatarComponent from "@/components/common/userAvatar";
import { CommentOutline, EllipsisVertical } from "@/icons";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";
import { useGetCommentByIdQuery } from "../../../api/hooks/commentQueryHooks";

interface FeedPreviewProps {
  feed: MessageFeedResponse;
  stats: FeedStatsResponse;
}
export default function FeedPreview({ feed, stats }: FeedPreviewProps) {
  const { data: messageResponse, isLoading } = useGetMessageByIdQuery(feed?.messageId ?? -1);
  const [showComments, setShowComments] = useSearchParamsState<boolean>(`feedShowCommentsPop${feed?.feedId}`, false);
  const commentQuery = useGetCommentByIdQuery(feed?.feedId ?? -1);
  const commentCount = commentQuery.data?.totalChildren ?? 0;

  const simulatedImageUrl = `https://tse2.mm.bing.net/th/id/OIP.druUEHdZrBEuZPn2w80Y1QHaNK?rs=1&pid=ImgDetMain&o=7&rm=3${feed?.feedId}`;
  const showSimulatedImage = feed?.userId === 15031;

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

        {/* 模拟图片显示区域 */}
        {showSimulatedImage && (
          <div className="my-4 rounded-2xl overflow-hidden">
            <img
              src={simulatedImageUrl}
              alt="用户发布图片"
              className="w-48 h-auto object-cover"
            />
          </div>
        )}
        {/* 正文内容 */}
        {feed.description && (
          <p className="text-base-content/80 text-sm mb-4 whitespace-pre-line">
            {feed.description}
          </p>
        )}

        {/* 底部操作栏 */}
        <div className="flex justify-between items-center mt-auto">
          <div className="join">
            <LikeIconButton
              targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "1" }}
              className="w-12 h-8 flex items-center justify-center join-item btn btn-sm btn-ghost"
              direction="row"
            />
            {/* 评论按钮，点击后直接在下方展开 */}
            <button
              type="button"
              className="h-10 flex items-center justify-center join-item btn btn-sm btn-ghost min-w-fit"
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
            >
              <CommentOutline className="h-6 w-5" />
              <span className="text-xs whitespace-nowrap">{`${commentCount}`}</span>
            </button>
            <ShareIconButton searchKey={`feedShowSharePop${feed?.feedId}`} />
          </div>

          <div className="flex flex-col items-end gap-1">
            <button type="button" className="btn btn-sm btn-ghost rounded-full p-2">
              <EllipsisVertical className="w-6 h-6" />
            </button>
            {(feed.createTime || feed.messageId) && (
              <div className="text-xs text-base-content/50 space-x-2 flex">
                {feed.messageId && (
                  <span className="text-[10px]">
                    消息ID:
                    {" "}
                    {feed.messageId}
                  </span>
                )}
                {feed.createTime && (
                  <span className="text-[10px]">{feed.createTime}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 评论区，在showComments为true时直接展开 */}
      {showComments && (
        <div className="p-4 bg-base-200 border-t border-base-300">
          <CommentPanel targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "1" }} className="h-full"></CommentPanel>
        </div>
      )}
    </div>
  );
}
