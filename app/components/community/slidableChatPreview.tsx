import type { ChatMessageResponse } from "../../../api";
import { PreviewMessage } from "@/components/chat/smallComponents/previewMessage";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import React, { useMemo } from "react";
import { useGetRoleQuery } from "../../../api/queryHooks";
import BetterImg from "../common/betterImg";

/**
 * 可滑动的聊天记录预览组件，显示转发消息的预览。
 * @param props 组件属性
 * @param props.messageResponse 包含转发消息列表的聊天消息响应
 * @param props.maxHeight 展开时的最大高度，默认为 "400px"
 * @param props.showAvatars 是否显示头像，默认为 true
 * @param props.beFull 是否完整显示所有消息，true时显示所有消息，false时只显示前3条，默认为 false
 */
export default function SlidableChatPreview({
  messageResponse,
  maxHeight = "400px",
  showAvatars = true,
  beFull = false,
}: {
  messageResponse: ChatMessageResponse;
  maxHeight?: string;
  showAvatars?: boolean;
  beFull?: boolean;
}) {
  // 获取转发消息列表
  const messageList = useMemo(() =>
    messageResponse.message.extra?.forwardMessage?.messageList ?? [], [messageResponse.message.extra?.forwardMessage?.messageList]);

  // 根据beFull参数决定显示的消息数量
  const displayMessages = useMemo(() =>
    beFull ? messageList : messageList.slice(0, 3), [messageList, beFull]);

  // 预览消息（用于简化显示模式）
  const previewMessages = useMemo(() => messageList.slice(0, 3), [messageList]);

  // 渲染预览消息（简化版本，仅在非完整模式下使用）
  const renderedPreviewMessages = useMemo(() => {
    if (beFull)
      return null;
    return previewMessages.map(item => (
      <div key={`${item.message.messageId}`} className="text-xs text-base-content/70 truncate">
        <PreviewMessage message={item.message} className="block" />
      </div>
    ));
  }, [previewMessages, beFull]);

  // 渲染完整聊天消息（带头像）
  const renderedChatMessages = useMemo(() => {
    if (!beFull)
      return null;
    return displayMessages.map(item => (
      <ChatMessageItem
        key={item.message.messageId}
        chatMessageResponse={item}
        showAvatar={showAvatars}
      />
    ));
  }, [displayMessages, showAvatars, beFull]);

  return (
    <div className="w-full">
      {beFull
        ? (
            // 完整模式：显示所有聊天记录
            <div className="bg-base-100 rounded-box border border-base-300">
              {/* 头部信息 */}
              <div className="border-b border-base-300/50 p-3 rounded-t-box">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-base-content">
                    切片记录
                  </div>
                  <div className="text-xs text-base-content/50">
                    {messageList.length}
                    {" "}
                    条消息
                  </div>
                </div>
              </div>

              {/* 聊天消息列表 */}
              <div
                className="overflow-y-auto p-3 space-y-2"
                style={{
                  maxHeight,
                }}
              >
                {renderedChatMessages}
              </div>
            </div>
          )
        : (
            // 预览模式：只显示前3条消息的简化版本
            <div className="bg-base-200 rounded-box p-3 max-w-md">
              <div className="flex items-center pb-2 mb-2 border-b border-base-300/50">
                <div className="text-sm font-semibold text-base-content">
                  切片记录
                </div>
                <div className="ml-auto text-xs text-base-content/50">
                  {messageList.length}
                  {" "}
                  条
                </div>
              </div>
              <div className="space-y-1">
                {renderedPreviewMessages}
                {messageList.length > 3 && (
                  <div className="text-xs text-base-content/50">
                    ...还有
                    {" "}
                    {messageList.length - 3}
                    {" "}
                    条消息
                  </div>
                )}
              </div>
            </div>
          )}
    </div>
  );
}

/**
 * 单个聊天消息项组件
 */
function ChatMessageItem({
  chatMessageResponse,
  showAvatar = true,
}: {
  chatMessageResponse: ChatMessageResponse;
  showAvatar?: boolean;
}) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useGetRoleQuery(message.roleId);
  const role = useRoleRequest.data?.data;

  // 渲染消息内容
  const renderMessageContent = () => {
    if (message.messageType === 2) {
      // 图片消息
      const imgMsg = message.extra?.imageMessage;
      return (
        <div className="text-xs text-base-content/70">
          <BetterImg
            src={imgMsg?.url}
            className="max-h-24 max-w-32 rounded"
          />
          {imgMsg?.background && <span className="ml-1">(已设为背景)</span>}
        </div>
      );
    }
    else if (message.messageType === 5) {
      // 转发消息（递归显示）
      return (
        <div className="text-xs text-base-content/70">
          [转发消息]
        </div>
      );
    }
    else {
      // 文本消息
      return (
        <div className="text-sm text-base-content break-words whitespace-pre-wrap">
          {message.content}
        </div>
      );
    }
  };

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-base-200/50 transition-colors">
      {/* 头像 */}
      {showAvatar && (
        <div className="flex-shrink-0">
          <RoleAvatarComponent
            avatarId={message.avatarId}
            width={8}
            isRounded={true}
            withTitle={false}
            stopPopWindow={true}
          />
        </div>
      )}

      {/* 消息内容 */}
      <div className="flex-1 min-w-0">
        {/* 角色名 */}
        <div className="text-xs font-medium text-base-content/80 mb-1">
          {role?.roleName?.trim() || "未知角色"}
        </div>

        {/* 消息内容 */}
        {renderMessageContent()}

        {/* 回复消息预览 */}
        {message.replyMessageId && (
          <div className="mt-1 text-xs text-base-content/50">
            <span className="opacity-60">回复: </span>
            <PreviewMessage message={message.replyMessageId} />
          </div>
        )}
      </div>
    </div>
  );
}
