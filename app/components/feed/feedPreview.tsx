import type { Feed } from "../../../api";
import { ChatBubble } from "@/components/chat/chatBubble";
import UserAvatarComponent from "@/components/common/userAvatar";
import React from "react";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";

export default function FeedPreview({ feed }: { feed: Feed }) {
  const { data: messageResponse, isLoading } = useGetMessageByIdQuery(feed?.messageId ?? -1);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md mb-4 hover:shadow-sm transition-shadow w-full">
      <div className="card-body p-4 md:p-6 flex flex-col overflow-hidden relative">
        <div className="mb-4">
          {/* 聊天消息 */}
          {isLoading
            ? (
                <div className="text-sm text-base-content/40">加载中...</div>
              )
            : (
                messageResponse && (
                  <div>
                    <ChatBubble chatMessageResponse={messageResponse} useChatBubbleStyle={true} />
                  </div>
                )
              )}
        </div>

        {/* 头像和标题 */}
        <div className="flex items-start gap-3">
          <UserAvatarComponent
            userId={feed?.userId ?? -1}
            width={10}
            isRounded={true}
            withName={false}
          />
          <div className="flex-1">
            <h2 className="card-title text-base-content">
              {feed.title || "未命名动态"}
            </h2>
          </div>
        </div>

        {/* 正文内容 */}
        {feed.description && (
          <p className="text-base-content/80 text-sm mt-2 whitespace-pre-line">
            {feed.description}
          </p>
        )}
      </div>
    </div>
  );
};
