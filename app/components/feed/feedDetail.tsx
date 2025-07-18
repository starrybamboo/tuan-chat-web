import type { WheelEvent } from "react";
import { ChatBubble } from "@/components/chat/chatBubble";
import CollectionIconButton from "@/components/common/collection/collectionIconButton";
import CommentPanel from "@/components/common/comment/commentPanel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import LikeIconButton from "@/components/common/likeIconButton";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";

import React from "react";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";
import { useGetCommentByIdQuery } from "../../../api/hooks/commentQueryHooks";

import { useGetFeedByIdQuery } from "../../../api/hooks/FeedQueryHooks";
import { CopyLinkButton } from "../common/copyLinkButton";
import ShareToQQButton from "../common/shareToQQButton";

export default function FeedDetail({ feedId, handleWheel }: { feedId: number; handleWheel: (e: WheelEvent<HTMLDivElement>) => void }) {
  const feedQuery = useGetFeedByIdQuery(feedId);
  const feed = feedQuery.data;
  const [showComments, setShowComments] = useSearchParamsState<boolean>(`feedShowCommentsPop${feedId}`, false);
  const [showShare, setShowShare] = useSearchParamsState<boolean>(`feedShowSharePop${feedId}`, false);
  const getMessageQuery = useGetMessageByIdQuery(feed?.feed?.messageId ?? -1);
  const messageResponse = getMessageQuery.data;
  const commentQuery = useGetCommentByIdQuery(feed?.feed?.feedId ?? -1);
  const commentCount = commentQuery.data?.totalChildren ?? 0;

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
            {!messageResponse
              ? (
                  <div>请登录后查看详细内容</div>
                )
              : getMessageQuery.isLoading
                ? (
                    <div>加载中...</div>
                  )
                : getMessageQuery.isError
                  ? (
                      <div>加载失败</div>
                    )
                  : (
                      <ChatBubble chatMessageResponse={messageResponse} useChatBubbleStyle={false} />
                    )}
          </div>
        </div>

        {/* 标题和描述区域 - 固定在底部 */}
        <div className="p-4 ">
          <h2 className="text-lg font-semibold">{feed?.feed?.title}</h2>
          <p className="text-sm mt-1">{feed?.feed?.description || "暂无描述"}</p>
        </div>
      </div>

      {/* 右侧互动按钮 */}
      <div className="absolute right-4 bottom-1/4 flex flex-col items-center space-y-6">
        {!messageResponse
          ? <></>
          : (
              <UserAvatarComponent
                userId={feed?.feed?.userId ?? -1}
                width={12}
                isRounded={true}
                withName={true}
              >
              </UserAvatarComponent>
            )}

        {/* 点赞按钮 */}
        <LikeIconButton targetInfo={{ targetId: feed?.feed?.feedId ?? -1, targetType: "1" }}></LikeIconButton>
        {/* 收藏按钮 */}
        <CollectionIconButton targetInfo={{ resourceId: feed?.feed?.feedId ?? -1, resourceType: "1" }} />

        {/* 评论按钮 */}
        <button onClick={() => setShowComments(!showComments)} className="flex flex-col items-center" type="button">
          <div className="w-10 h-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-xs mt-1">{commentCount}</span>
        </button>

        {/* 分享按钮 */}
        <button onClick={() => setShowShare(!showShare)} className="flex flex-col items-center" type="button">
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
      <PopWindow isOpen={showShare} onClose={() => setShowShare(false)}>
        <div className="overflow-y-auto space-y-4 h-[40vh] w-[30vw] flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold">分享至</h2>
          <div className="flex gap-4 mt-4">
            {/* eslint-disable-next-line react-dom/no-missing-button-type */}
            <button className="btn btn-primary">社区</button>
            <ShareToQQButton feedId={1} />
            <CopyLinkButton />
          </div>
        </div>
      </PopWindow>
      <PopWindow isOpen={showComments} onClose={() => setShowComments(false)}>
        <div className="overflow-y-auto space-y-4 h-[80vh] w-[60vw] sm:w-[60vw]">
          <CommentPanel targetInfo={{ targetId: feed?.feed?.feedId ?? -1, targetType: "1" }} className="h-full"></CommentPanel>
        </div>
      </PopWindow>
    </div>
  );
}
