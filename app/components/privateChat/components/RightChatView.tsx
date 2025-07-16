import { SideDrawerToggle } from "@/components/common/sideDrawer";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { ChevronRight, EmojiIcon, Image2Fill, MoreMenu } from "@/icons";
import { useGetMessageDirectPageQuery, useSendMessageDirectMutation } from "api/hooks/MessageDirectQueryHooks";
import { useState } from "react";

export default function RightChatView(
  {
    currentContactUserId,
    currentContact,
    currentContactUserInfo,
  }: {
    currentContactUserId: number;
    currentContact: any; // 当前联系人信息
    currentContactUserInfo: any; // 当前联系人用户信息
  },
) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  // 用户输入信息
  const [messageInput, setMessageInput] = useState("");

  // 获取与当前联系人的私聊消息
  const directMessageQuery = useGetMessageDirectPageQuery(currentContactUserId, 5);
  // 发送私聊消息
  const sendMessageDirectMutation = useSendMessageDirectMutation();

  function handleSendMessage() {
    if (messageInput.trim() === "")
      return;
    sendMessageDirectMutation.mutate({
      receiverId: currentContactUserId || -1,
      content: messageInput,
      messageType: 1,
      extra: {},
    }, {
      onSettled: () => {
        setMessageInput("");
        directMessageQuery.refetch();
      },
    });
  }

  return (
    <div className="flex-1 bg-base-100 border-l border-base-300 flex flex-col">
      {/* 聊天顶部栏 */}
      <div className="h-10 w-full bg-base-100 border-b border-base-300 flex items-center px-4 relative">
        <SideDrawerToggle htmlFor="private-chat">
          <ChevronRight className="size-6" />
        </SideDrawerToggle>
        <span className="absolute left-1/2 transform -translate-x-1/2">
          {currentContact ? `${currentContactUserInfo?.username}` : "选择联系人"}
        </span>
        <span className="absolute right-0 transform -translate-x-4">
          <MoreMenu className="size-6 cursor-pointer rotate-90" />
        </span>
      </div>
      {/* 聊天消息区域 */}
      <div className="flex-1 w-full overflow-auto p-4">
        {currentContactUserId
          ? (
              <div className="space-y-4">
                {directMessageQuery.historyMessages.slice().reverse().map(msg => (
                  msg.senderId === userId
                    ? (
                        <div key={msg.messageId} className="flex items-start justify-end gap-2">
                          <div className="bg-info p-2 rounded-lg">
                            {msg.content}
                          </div>
                          <UserAvatarComponent
                            userId={msg.senderId || -1}
                            width={12}
                            isRounded={true}
                            uniqueKey={`${msg.senderId}${msg.messageId}`}
                          />
                        </div>
                      )
                    : (
                        <div key={msg.messageId} className="flex items-start gap-2">
                          <UserAvatarComponent
                            userId={msg.senderId || -1}
                            width={12}
                            isRounded={true}
                            uniqueKey={`${msg.senderId}${msg.messageId}`}
                          />
                          <div className="bg-base-300 p-2 rounded-lg">
                            {msg.content}
                          </div>
                        </div>
                      )
                ))}
              </div>
            )
          : (
              <div className="flex items-center justify-center w-full h-full text-gray-500">
                请选择一个联系人开始聊天
              </div>
            )}
      </div>
      {/* 输入区域 */}
      {currentContactUserId && (
        <div className="h-36 w-full border-t border-base-300 flex flex-col px-6 pt-4 pb-2">
          <div className="flex-1 w-full">
            <textarea
              className="w-full h-full resize-none px-2 py-1 rounded-lg focus:outline-none"
              placeholder="请输入消息内容..."
              onChange={e => setMessageInput(e.target.value)}
              value={messageInput}
            />
          </div>
          <div className="h-12 w-full flex items-center justify-between px-2">
            <div className="h-full flex items-center gap-4">
              <EmojiIcon className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
              <Image2Fill className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            </div>
            <button
              type="button"
              className="btn btn-info"
              onClick={handleSendMessage}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
