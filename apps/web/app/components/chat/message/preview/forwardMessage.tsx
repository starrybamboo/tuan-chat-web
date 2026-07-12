import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { ChatBubble } from "@/components/chat/message/chatBubble";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import toastWindow from "@/components/common/toastWindow/toastWindow";

import type { ChatMessageResponse } from "../../../../../api";

/**
 * 转发消息组件，显示转发消息的预览，点击查看详情。
 * @param props 组件属性
 * @param props.messageResponse 包含转发消息列表的聊天消息响应
 */
export default function ForwardMessage({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  // 限制预览消息数为3条
  const messageList = useMemo(() =>
    messageResponse.message.extra?.forwardMessage?.messageList ?? [], [messageResponse.message.extra?.forwardMessage?.messageList]);
  const previewMessages = useMemo(() => messageList.slice(0, 3), [messageList]);
  // const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`forwardMegDetailPop${messageResponse.message.messageId}`, false);

  const renderedPreviewMessages = useMemo(() => {
    return previewMessages.map(item => (
      <div key={`${item.message.messageId}`} className="
        text-xs text-base-content/70 truncate
      " title={item.message.content}>
        <PreviewMessage message={item.message} className="block" />
      </div>
    ));
  }, [previewMessages]);

  const queryClient = useQueryClient();
  const previewLabel = useMemo(() => {
    const previewText = previewMessages
      .map(item => item.message.content)
      .filter(Boolean)
      .join("；");
    return previewText
      ? `查看转发消息详情，共 ${messageList.length} 条。预览：${previewText}`
      : `查看转发消息详情，共 ${messageList.length} 条`;
  }, [messageList.length, previewMessages]);

  const openForwardDetail = () => toastWindow(
    <QueryClientProvider client={queryClient}>
      <div
        className="w-[60vw] max-h-[80vh] overflow-auto"
      >
        {messageList.map(item => (
          <ChatBubble chatMessageResponse={item} key={item.message.messageId}></ChatBubble>
        ))}
      </div>
    </QueryClientProvider>,
  );

  return (
    <div>
      <button
        type="button"
        className="bg-base-200 rounded-md p-3 max-w-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/30"
        onClick={openForwardDetail}
        aria-haspopup="dialog"
        aria-label={previewLabel}
      >
        <div className="flex items-center pb-2 mb-2 border-b border-base-300/50">
          <div className="text-sm font-semibold text-base-content">
            转发消息
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
      </button>
    </div>
  );
}
