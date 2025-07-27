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
      <div className="flex w-full h-full">
        {/* 左侧图文内容 */}
        <div className="w-[38%] flex justify-center items-center border-r border-gray-300">
          {messageResponse
            ? <ChatBubble chatMessageResponse={messageResponse} useChatBubbleStyle={false} />
            : getMessageQuery.isLoading
              ? <div>加载中...</div>
              : getMessageQuery.isError
                ? <div>加载失败</div>
                : <div>请登录后查看详细内容</div>}
        </div>

        {/* 右侧信息区 */}
        <div className="w-[62%] flex flex-col justify-start p-6 overflow-y-auto">
          {/* 顶部头像 */}
          <div className="mb-2">
            {messageResponse && (
              <UserAvatarComponent
                userId={feed?.feed?.userId ?? -1}
                width={10}
                isRounded={true}
                withName={true}
              />
            )}
          </div>

          {/* 标题与描述 */}
          <div className="mb-2">
            <h2 className="text-lg font-bold mb-1">{feed?.feed?.title}</h2>
            <p className="text-sm text-gray-500">{feed?.feed?.description || "暂无描述"}</p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-300 my-2" />

          {/* 评论区 */}
          <div className="mb-4">
            <CommentPanel targetInfo={{ targetId: feed?.feed?.feedId ?? -1, targetType: "1" }} className="h-full" />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-6">
            <LikeIconButton
              targetInfo={{ targetId: feed?.feed?.feedId ?? -1, targetType: "1" }}
              showCount={true}
            />
            <CollectionIconButton targetInfo={{ resourceId: feed?.feed?.feedId ?? -1, resourceType: "1" }} />
            <button onClick={() => setShowComments(!showComments)} className="flex items-center space-x-1" type="button">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{commentCount}</span>
            </button>
            <button onClick={() => setShowShare(!showShare)} className="flex items-center space-x-1" type="button">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>分享</span>
            </button>
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      <PopWindow isOpen={showShare} onClose={() => setShowShare(false)}>
        <div className="overflow-y-auto space-y-4 h-[40vh] w-[30vw] flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold">分享至</h2>
          <div className="flex gap-4 mt-4">
            <button className="btn btn-primary">社区</button>
            <ShareToQQButton feedId={feedId} />
            <CopyLinkButton />
          </div>
        </div>
      </PopWindow>
    </div>
  );
}
