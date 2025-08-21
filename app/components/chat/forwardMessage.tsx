import type { ChatMessageResponse } from "api";
import { ChatBubble } from "@/components/chat/chatBubble";
import { RoomContext } from "@/components/chat/roomContext";
import { PreviewMessage } from "@/components/chat/smallComponents/previewMessage";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import React, { use, useMemo } from "react";

/**
 * 转发消息组件，显示转发消息的预览，点击查看详情。
 * @param messageResponse 包含转发消息列表的聊天消息响应
 */
export default function ForwardMessage({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  // 限制预览消息数为3条
  const messageList = messageResponse.message.extra?.forwardMessage?.messageList ?? [];
  const previewMessages = messageList.slice(0, 3);
  const useChatBubbleStyle = use(RoomContext).useChatBubbleStyle;
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`forwardMegDetailPop${messageResponse.message.messageId}`, false);
  const renderedPreviewMessages = useMemo(() => {
    return previewMessages.map(item => (
      <div key={`${item.message.messageId}`} className="bg-base-100 p-2 rounded-box shadow-sm">
        <PreviewMessage message={item.message}></PreviewMessage>
      </div>
    ));
  }, []);

  const renderedMessages = useMemo(() => {
    if (!isOpen) {
      return <></>;
    }
    return messageList.map(item => (
      <ChatBubble chatMessageResponse={item} key={item.message.messageId}></ChatBubble>
    ));
  }, [useChatBubbleStyle, isOpen]);

  return (
    <div>
      <div className="bg-base-200 rounded-box p-1 max-w-md" onClick={() => setIsOpen(true)}>
        <div className="flex items-center pb-2">
          <div className="text-sm font-semibold text-base-content">
            转发消息
          </div>
          <div className="ml-auto text-xs text-base-content/50">
            {messageList.length}
            条
          </div>
        </div>
        <div className="space-y-2">
          {renderedPreviewMessages}
          {messageList.length > 3 && (
            <div className="text-xs text-base-content/50 text-center">
              还有
              {messageList.length - 3}
              条消息未显示
            </div>
          )}
        </div>
      </div>
      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="w-[60vw] max-h-[80vh] overflow-auto">
          {renderedMessages}
        </div>
      </PopWindow>
    </div>
  );
}
