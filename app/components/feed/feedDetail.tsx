import type { WheelEvent } from "react";
import { ChatBubble } from "@/components/chat/chatBubble";
import CommentPanel from "@/components/common/comment/commentPanel";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useState } from "react";
import { useGetFeedByIdQuery, useGetMessageByIdQuery } from "../../../api/queryHooks";

export default function FeedDetail({ feedId, handleWheel }: { feedId: number; handleWheel: (e: WheelEvent<HTMLDivElement>) => void }) {
  const feedQuery = useGetFeedByIdQuery(feedId);
  const feed = feedQuery.data;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(1243);
  const [showComments, setShowComments] = useState(false);
  const getMessageQuery = useGetMessageByIdQuery(feed?.messageId ?? -1);
  const messageResponse = getMessageQuery.data;

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  if (feedQuery.isLoading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>;
  }

  if (feedQuery.isError) {
    return (
      <div className="text-red-500 text-center p-4">
        加载失败:
        {feedQuery.error.message}
      </div>
    );
  }

  if (!feed) {
    return <div className="text-center p-4">内容不存在</div>;
  }

  return (
    <div
      className="relative h-screen bg-base-200/50 overflow-hidden"
      onWheel={(e) => {
        if (!showComments) {
          handleWheel(e);
        }
      }}
    >
      <div className="h-full w-full flex flex-col">
        {/* 内容展示区 */}
        <div className="flex-1 flex justify-center items-center relative">
          <div className="text-center">
            {
              messageResponse && <ChatBubble chatMessageResponse={messageResponse} useChatBubbleStyle={false}></ChatBubble>
            }
          </div>
        </div>

        {/* 标题和描述区域 - 固定在底部 */}
        <div className="p-4 ">
          <h2 className="text-lg font-semibold">{feed.title}</h2>
          <p className="text-sm mt-1">{feed.description || "暂无描述"}</p>
        </div>
      </div>

      {/* 右侧互动按钮 */}
      <div className="absolute right-4 bottom-1/4 flex flex-col items-center space-y-6">
        <UserAvatarComponent
          userId={feed.userId ?? -1}
          width={12}
          isRounded={true}
          withName={true}
        >
        </UserAvatarComponent>

        {/* 点赞按钮 */}
        <button onClick={toggleLike} className="flex flex-col items-center" type="button">
          <div className="relative w-10 h-10">
            <div className={`absolute inset-0 ${liked ? "text-red-500" : ""}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill={liked ? "currentColor" : "none"}
                />
              </svg>
            </div>
          </div>
          <span className="text-xs mt-1">{likeCount}</span>
        </button>

        {/* 评论按钮 */}
        <button onClick={() => setShowComments(!showComments)} className="flex flex-col items-center" type="button">
          <div className="w-10 h-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-xs mt-1">{114}</span>
        </button>

        {/* 分享按钮 */}
        <button className="flex flex-col items-center" type="button">
          <div className="w-10 h-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <span className="text-xs mt-1">分享</span>
        </button>
      </div>

      {/* 底部评论区 - 弹出式 */}
      {showComments && (
        <div className="absolute inset-0 z-10 shadow-xl">
          <div className="absolute bottom-0 left-0 right-0 bg-base-100/90 rounded-t-3xl p-4 h-[70vh] flex flex-col">
            {/* 评论区标题和关闭按钮 */}
            <div className="flex justify-end ">
              <button onClick={() => setShowComments(false)} className="text-gray-400" type="button">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 评论列表 */}
            <div className="flex-1 overflow-y-auto space-y-4 h-full">
              <CommentPanel targetInfo={{ targetId: feed.feedId ?? -1, targetType: "1" }} className=""></CommentPanel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
