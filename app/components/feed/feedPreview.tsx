import type { Feed } from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import CommentPanel from "@/components/common/comment/commentPanel";
import { CopyLinkButton } from "@/components/common/copyLinkButton";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import LikeIconButton from "@/components/common/likeIconButton";
import { PopWindow } from "@/components/common/popWindow";
import ShareToQQButton from "@/components/common/shareToQQButton";
import UserAvatarComponent from "@/components/common/userAvatar";
import { CommentOutline, EllipsisVertical } from "@/icons";
import React from "react";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";
import { useGetFeedByIdQuery } from "../../../api/hooks/FeedQueryHooks";

export default function FeedPreview({ feed }: { feed: Feed }) {
  const { data: messageResponse, isLoading } = useGetMessageByIdQuery(feed?.messageId ?? -1);
  const feedQuery = useGetFeedByIdQuery(feed?.feedId ?? -1);
  const commentCount = feedQuery?.data?.stats?.commentCount;
  const [showComments, setShowComments] = useSearchParamsState<boolean>(`feedShowCommentsPop${feed?.feedId}`, false);
  const [showShare, setShowShare] = useSearchParamsState<boolean>(`feedShowSharePop${feed?.feedId}`, false);
  return (
    <div className="card bg-base-100 border border-base-300 shadow-md mb-4 hover:shadow-sm transition-shadow w-full h-125">
      <div className="card-body p-4 md:p-6 flex flex-col overflow-hidden h-full relative">
        <div className=" min-h-0 mb-16 overflow-y-auto h-2/3">
          {/* 聊天消息 */}
          {isLoading
            ? (
                <div className="text-sm text-base-content/40">加载中...</div>
              )
            : (
                messageResponse && (
                  <div className="mb-4">
                    <ChatBubble chatMessageResponse={messageResponse} useChatBubbleStyle={true} />
                  </div>
                )
              )}
        </div>

        <div className="flex flex-col gap-3 mt-4">
          {/* 相关信息 */}

          {/* 头部 - 包含头像和标题 */}
          <div className="flex items-start gap-3 mb-0">
            <UserAvatarComponent
              userId={feed?.userId ?? -1}
              width={10}
              isRounded={true}
              withName={false}
            />
            <div className="flex-1">
              <h2 className="card-title text-base-content">
                {feed.title || "未命名动态"}
                {feed.feedId && (
                  <span className="text-sm font-normal text-base-content/60 ml-2">
                    #
                    {feed.feedId}
                  </span>
                )}
              </h2>
              {feed.userId && (
                <p className="text-xs text-base-content/60 mt-1">
                  用户ID:
                  {" "}
                  {feed.userId}
                </p>
              )}
            </div>
          </div>

          {/* 正文内容 */}
          {feed.description && (
            <p className="text-base-content/80 text-sm mb-0 whitespace-pre-line">
              {feed.description}
            </p>
          )}

          <div>
            <div className="card-actions flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mt-0">
              <div className="join">

                {/* 点赞按钮 */}
                <div onClick={e => e.stopPropagation()} className="w-12 h-8 flex items-center justify-center join-item btn btn-sm btn-ghost">
                  <LikeIconButton
                    targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "1" }}
                    className="w-9 h-6"
                    direction="row"
                  />
                </div>

                {/* 评论按钮 */}
                <button
                  type="button"
                  className="w-12 h-10 flex  items-center justify-center join-item btn btn-sm btn-ghost p-0 -translate-y-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(!showComments);
                  }}
                >
                  <CommentOutline className="h-6 w-5" />
                  <span className="text-xs">{`${commentCount}`}</span>
                </button>

                {/* 分享按钮 */}
                <button
                  type="button"
                  className="w-12 h-8 flex  items-center justify-center join-item btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShare(!showShare);
                  }}
                >
                  <div className="w-5 h-5">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g transform="scale(1.2) translate(-2,-2)">
                        <path
                          d="M14 5v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7zm2 4.83L18.17 12L16 14.17V12.9h-2c-2.07 0-3.93.38-5.66.95c1.4-1.39 3.2-2.48 5.94-2.85l1.72-.27z"
                        />
                      </g>
                    </svg>
                  </div>
                </button>
                {/* 更多按钮 */}
                <button type="button" className="w-12 h-12 flex items-center justify-center join-item btn btn-sm btn-ghost absolute bottom-4 right-4 rounded-full ">
                  <EllipsisVertical />
                </button>
              </div>
            </div>

            {/* ID和时间 */}
            <div className="flex flex-col items-start gap-1">
              {(feed.createTime || feed.messageId) && (
                <div className="text-xs text-base-content/50 space-x-2 flex">
                  {feed.messageId && (
                    <span className="text-[10px]">
                      消息ID:
                      {feed?.messageId}
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
      </div>
      {/* 评论和分享弹窗 */}
      <PopWindow isOpen={showComments} onClose={() => setShowComments(false)}>
        <div className="overflow-y-auto space-y-4 h-[80vh] w-[60vw] sm:w-[60vw]">
          <CommentPanel targetInfo={{ targetId: feed?.feedId ?? -1, targetType: "1" }} className="h-full"></CommentPanel>
        </div>
      </PopWindow>
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
    </div>
  );
};
