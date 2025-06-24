import type { ChatMessageResponse, Message } from "api";
import { ChatBubble } from "@/components/chat/chatBubble";
import { RoomContext } from "@/components/chat/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { use, useMemo } from "react";
import { useGetMessageByIdQuery } from "../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "../../../api/queryHooks";

export function PreviewMessage({ message, className, showData = true }: {
  message: Message | number; // 允许message为id
  className?: string;
  showData?: boolean;
}) {
  const roomContext = use(RoomContext);

  // 如果传的是id就从历史消息里面找，没找到就去query。如果是Message类型就直接拿来用
  const foundMessageInHistory = typeof message === "number"
    ? roomContext.historyMessages?.find(item => item.message.messageID === message)?.message
    : null;
  const messageQuery = useGetMessageByIdQuery(
    typeof message === "number" && !foundMessageInHistory ? message : -1,
  );
  const messageBody = typeof message === "number"
    ? foundMessageInHistory || messageQuery.data?.message
    : message;

  const useRoleRequest = useGetRoleQuery(messageBody?.roleId ?? -1);
  const role = useRoleRequest.data?.data;
  const isTextMessage = messageBody?.messageType === 1;
  return (
    <div className={className}>
      <div className="flex items-center">
        <div className="text-sm text-base-content">
          {role?.roleName || "YOU_KNOW_WHO"}
        </div>
        {
          showData
          && (
            <div className="ml-2 text-xs text-base-content/50">
              {messageBody?.createTime}
            </div>
          )
        }
      </div>

      {isTextMessage
        ? (
            <p className="text-sm text-base-content break-words line-clamp-1">
              {messageBody.content}
            </p>
          )
        : (
            <div className="text-sm text-base-content/50">
              [非文本消息]
            </div>
          )}
    </div>
  );
}

export default function ForwardMessage({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  // 限制预览消息数为3条
  const messageList = messageResponse.message.extra?.forwardMessage?.messageList ?? [];
  const previewMessages = messageList.slice(0, 3);
  const useChatBubbleStyle = use(RoomContext).useChatBubbleStyle;
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`forwardMegDetailPop${messageResponse.message.messageID}`, false);
  const renderedPreviewMessages = useMemo(() => {
    return previewMessages.map(item => (
      <div key={`${item.message.messageID}`} className="bg-base-100 p-3 rounded-box shadow-sm">
        <PreviewMessage message={item.message}></PreviewMessage>
      </div>
    ));
  }, []);

  const renderedMessages = useMemo(() => {
    if (!isOpen) {
      return <></>;
    }
    return messageList.map(item => (
      <ChatBubble chatMessageResponse={item} key={item.message.messageID}></ChatBubble>
    ));
  }, [useChatBubbleStyle, isOpen]);

  return (
    <div>
      <div className="bg-base-200 rounded-box p-4 max-w-md" onClick={() => setIsOpen(true)}>
        <div className="flex items-center mb-2">
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
