import type { ChatMessageResponse, Message } from "api";
import { ChatBubble } from "@/components/chat/chatBubble";
import { RoomContext } from "@/components/chat/roomContext";
import { PopWindow } from "@/components/common/popWindow";
import { use, useMemo, useState } from "react";
import { useGetRoleQuery } from "../../../api/queryHooks";

function PreviewMessage({ message }: { message: Message }) {
  const useRoleRequest = useGetRoleQuery(message.roleId);
  const role = useRoleRequest.data?.data;
  const isTextMessage = message.messageType === 1;
  return (
    <div>
      <div className="flex items-center">
        <div className="text-sm font-semibold text-base-content">
          {role?.roleName || "YOU_KNOW_WHO"}
        </div>
        <div className="ml-2 text-xs text-base-content/50">
          {message.createTime}
        </div>
      </div>

      {isTextMessage
        ? (
            <p className="mt-1 text-sm text-base-content break-words line-clamp-2">
              {message.content}
            </p>
          )
        : (
            <div className="mt-1 text-sm text-base-content/50">
              [非文本消息]
            </div>
          )}
    </div>
  );
}

export default function ForwardMessage({ messageList }: { messageList: ChatMessageResponse[] }) {
  // 限制预览消息数为3条
  const previewMessages = messageList.slice(0, 3);
  const useChatBubbleStyle = use(RoomContext).useChatBubbleStyle;
  const renderedPreviewMessages = useMemo(() => {
    return previewMessages.map((item, index) => (
      <div key={`${item.message.messageID}_${index}`} className="bg-base-100 p-3 rounded-box shadow-sm">
        <PreviewMessage message={item.message}></PreviewMessage>
      </div>
    ));
  }, []);

  const renderedMessages = useMemo(() => {
    return messageList.map(item => (
      <ChatBubble chatMessageResponse={item} useChatBubbleStyle={useChatBubbleStyle} key={item.message.messageID}></ChatBubble>
    ));
  }, [useChatBubbleStyle]);

  const [isOpen, setIsOpen] = useState(false);

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
