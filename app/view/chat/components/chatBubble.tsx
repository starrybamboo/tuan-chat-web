// import type { Message } from "@/view/chat/components/message";
import type { ChatMessageResponse } from "api";
import RoleAvatarComponent from "@/view/common/roleAvatar";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
/**
 * 聊天风格的对话框组件
 */

export function ChatBubble({ chatMessageResponse, useChatBoxStyle }: { chatMessageResponse: ChatMessageResponse; useChatBoxStyle: boolean }) {
  const message = chatMessageResponse.message;
  const useRoleRequest = useQuery({
    queryKey: ["roleController.getRole", message.roleId],
    queryFn: () => tuanchat.roleController.getRole(message.roleId),
    staleTime: 600000,
  });

  const role = useRoleRequest.data?.data;

  if (useChatBoxStyle) {
    return (
    // <div className={message.type !== "user.tsx" ? "chat chat-start" : "chat chat-end"} key={message.id}>
      <div className="chat chat-start" key={message.messageID}>
        <div className="avatar chat-image">
          <RoleAvatarComponent avatarId={message.avatarId} width={10} isRounded={true} withTitle={false}></RoleAvatarComponent>
        </div>

        <div
          className={message.messageType !== 0 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}
        >
          <div className="" style={{ whiteSpace: "pre-wrap" }}>
            {message.content}
          </div>
        </div>
        <div className="chat-footer">
          {role?.roleName?.trim() || "Undefined"}
          <time className="text-xs opacity-50">
            {message.createTime ?? ""}
          </time>
        </div>
        {/* <div className="chat-footer opacity-50">Seen</div> */}
      </div>
    );
  }
  else {
    return (
      <div className="flex w-full mb-4" key={message.messageID}>
        {/* 圆角矩形头像 */}
        <div className="flex-shrink-0 mr-3">
          <div className="w-20 h-20 rounded-md overflow-hidden">
            <RoleAvatarComponent avatarId={message.avatarId} width={20} isRounded={false} withTitle={false}></RoleAvatarComponent>
          </div>
        </div>

        {/* 消息内容 */}
        <div className="flex-1">
          {/* 角色名 */}
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {role?.roleName?.trim() || "Undefined"}
          </div>

          {/* 消息文本（纯文字，无边框） */}
          <div
            className="text-base text-gray-700 dark:text-gray-300 mt-1"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {message.content}
          </div>

          {/* 时间 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {message.createTime?.toLocaleString() ?? ""}
          </div>
        </div>
      </div>
    );
  }
}
